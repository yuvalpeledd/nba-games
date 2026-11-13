// The connection. Each table is its own lib (@nba/sql-<table>, libs/sql/tables/): import its module, DAL service and
// types from there.
export {
  postgresOptions,
  SqlModule,
  TEST_DB_NAME,
  testPostgresOptions,
} from './sql.module';
