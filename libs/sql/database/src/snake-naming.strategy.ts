import { DefaultNamingStrategy } from 'typeorm';

// camelCase properties → snake_case columns (organizationId → organization_id, createdAt → created_at).
export class SnakeNamingStrategy extends DefaultNamingStrategy {
  override columnName(
    propertyName: string,
    customName: string,
    embeddedPrefixes: string[],
  ): string {
    if (customName) return customName;
    return [...embeddedPrefixes, propertyName]
      .join('_')
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      .toLowerCase();
  }
}
