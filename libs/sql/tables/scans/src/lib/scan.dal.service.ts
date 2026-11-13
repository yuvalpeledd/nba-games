import { Injectable } from '@nestjs/common';
import { ScanCreateObject, ScanEntity } from './scan.entity';
import { ScanRepo } from './scan.repo';

@Injectable()
export class ScanDalService {
  constructor(private readonly repo: ScanRepo) {}

  async record(scan: ScanCreateObject): Promise<ScanEntity> {
    return this.repo.save(this.repo.create(scan));
  }

  // The latest to start; null before the first.
  async findLast(): Promise<ScanEntity | null> {
    const [last] = await this.repo.find({
      order: { startedAt: 'DESC' },
      take: 1,
    });
    return last ?? null;
  }
}
