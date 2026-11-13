import {
  appWith,
  callsOf,
  Failure,
  fillIn,
  firebase,
  firebaseError,
  stubApi,
} from '@nba/web-test-utils';
import { fireEvent, screen, within } from '@testing-library/react';
import { reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ProfilePage } from './ProfilePage';

const { renderAt } = appWith({ ProfilePage });

const DANA = { id: 'u1', name: 'Dana Levi', email: 'dana@nba.dev' };

const save = () =>
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }),
  );

describe('ProfilePage', () => {
  it("opens from the navbar's menu: the user's name and email", async () => {
    stubApi({ 'GET /me': DANA });
    renderAt('/');

    fireEvent.click(await screen.findByRole('button', { name: 'Dana Levi' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Profile' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dana Levi' }),
    ).toBeTruthy();
    expect(window.location.pathname).toBe('/profile');
    expect(screen.getByText('dana@nba.dev')).toBeTruthy();
  });

  describe('Edit', () => {
    const openEdit = async (routes: Record<string, unknown> = {}) => {
      const fetchMock = stubApi({ 'GET /me': DANA, ...routes });
      renderAt('/profile');
      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
      await screen.findByRole('dialog', { name: 'Edit profile' });
      return fetchMock;
    };

    it('renames the user, and shows the new name', async () => {
      const fetchMock = await openEdit({
        'PATCH /me': { ...DANA, name: 'Dana Cohen' },
      });
      expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(
        'Dana Levi',
      );
      await fillIn({ Name: 'Dana Cohen' });
      save();

      expect(await screen.findByText('Profile saved')).toBeTruthy();
      expect(callsOf(fetchMock, 'PATCH')).toEqual([
        ['/api/me', { name: 'Dana Cohen' }],
      ]);
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Dana Cohen' }),
      ).toBeTruthy();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('refuses an empty name without asking the API', async () => {
      const fetchMock = await openEdit();
      await fillIn({ Name: ' ' });
      save();

      expect(await screen.findByText('Required')).toBeTruthy();
      expect(screen.getByLabelText('Name').getAttribute('aria-invalid')).toBe(
        'true',
      );
      expect(callsOf(fetchMock, 'PATCH')).toEqual([]);
    });

    it('says so when the API fails, and stays open', async () => {
      await openEdit({
        'PATCH /me': new Failure(500, { statusCode: 500, message: 'Oops' }),
      });
      await fillIn({ Name: 'Dana Cohen' });
      save();

      expect(
        await screen.findByText("Couldn't save your profile, try again"),
      ).toBeTruthy();
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
  });

  describe('Change password', () => {
    const openChangePassword = async () => {
      const fetchMock = stubApi({ 'GET /me': DANA });
      renderAt('/profile');
      fireEvent.click(
        await screen.findByRole('button', { name: 'Change password' }),
      );
      await screen.findByRole('dialog', { name: 'Change password' });
      return fetchMock;
    };

    const typePasswords = async (
      current: string,
      next: string,
      again = next,
    ) => {
      await fillIn({
        'Current password': current,
        'New password': next,
        'Confirm new password': again,
      });
      save();
    };

    it('changes it through Firebase: the current one signs in again first', async () => {
      const fetchMock = await openChangePassword();
      await typePasswords('old-secret', 'new-secret-1');

      expect(await screen.findByText('Password changed')).toBeTruthy();
      expect(reauthenticateWithCredential).toHaveBeenCalledWith(firebase.user, {
        email: 'dana@nba.dev',
        password: 'old-secret',
      });
      expect(updatePassword).toHaveBeenCalledWith(
        firebase.user,
        'new-secret-1',
      );
      // Not through the API: Firebase keeps the password.
      expect(
        fetchMock.mock.calls.filter(
          ([, init]) => (init?.method ?? 'GET') !== 'GET',
        ),
      ).toEqual([]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('marks a wrong current password, on its field and in a toast', async () => {
      vi.mocked(reauthenticateWithCredential).mockRejectedValueOnce(
        firebaseError('auth/invalid-credential'),
      );
      await openChangePassword();
      await typePasswords('wrong-secret', 'new-secret-1');

      expect(await screen.findAllByText('Wrong password')).toHaveLength(2);
      expect(
        screen.getByLabelText('Current password').getAttribute('aria-invalid'),
      ).toBe('true');
      expect(updatePassword).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('refuses a missing current password, a short new one and a confirmation that differs, without asking Firebase', async () => {
      await openChangePassword();
      await typePasswords('', 'short', 'shorter');

      expect(await screen.findByText('Required')).toBeTruthy();
      expect(
        screen.getByText('Password must be at least 8 characters'),
      ).toBeTruthy();
      expect(screen.getByText("The passwords don't match")).toBeTruthy();
      expect(reauthenticateWithCredential).not.toHaveBeenCalled();
    });
  });
});
