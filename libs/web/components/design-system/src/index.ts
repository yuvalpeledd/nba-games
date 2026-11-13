// The design system's app-wide MUI overrides, in a lib of their own: main.tsx loads them after the app, so they come
// after the components' and pages' own styles, and only the app imports them (the specs have no styles), so changing
// them reruns no page's specs.
import './lib/index.scss';
