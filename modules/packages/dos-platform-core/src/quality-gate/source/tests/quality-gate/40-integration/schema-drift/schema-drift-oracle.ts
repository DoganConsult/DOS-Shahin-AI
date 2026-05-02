export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: string[];
}

export interface SchemaDriftReport {
  hasDrift: boolean;
  missingTables: string[];
  extraTables: string[];
  driftedColumns: Array<{
    table: string;
    column: string;
    issue: string;
    expected?: string;
    actual?: string;
  }>;
}

export interface SchemaDriftOracleOptions {
  expectedSchema: TableDefinition[];
  tolerance?: 'strict' | 'additive';
}

export class SchemaDriftOracle {
  private readonly expected: Map<string, TableDefinition>;
  private readonly tolerance: 'strict' | 'additive';

  constructor(opts: SchemaDriftOracleOptions) {
    this.expected = new Map(opts.expectedSchema.map(t => [t.name, t]));
    this.tolerance = opts.tolerance ?? 'strict';
  }

  compare(actual: TableDefinition[]): SchemaDriftReport {
    const actualMap = new Map(actual.map(t => [t.name, t]));
    const report: SchemaDriftReport = {
      hasDrift: false,
      missingTables: [],
      extraTables: [],
      driftedColumns: [],
    };

    for (const [tableName, expectedTable] of this.expected) {
      if (!actualMap.has(tableName)) {
        report.missingTables.push(tableName);
        continue;
      }

      const actualTable = actualMap.get(tableName)!;
      const actualColMap = new Map(actualTable.columns.map(c => [c.name, c]));

      for (const expectedCol of expectedTable.columns) {
        if (!actualColMap.has(expectedCol.name)) {
          report.driftedColumns.push({
            table: tableName,
            column: expectedCol.name,
            issue: 'missing_column',
            expected: `${expectedCol.type} (nullable: ${expectedCol.nullable})`,
          });
          continue;
        }

        const actualCol = actualColMap.get(expectedCol.name)!;

        if (actualCol.type.toLowerCase() !== expectedCol.type.toLowerCase()) {
          report.driftedColumns.push({
            table: tableName,
            column: expectedCol.name,
            issue: 'type_mismatch',
            expected: expectedCol.type,
            actual: actualCol.type,
          });
        }

        if (actualCol.nullable !== expectedCol.nullable) {
          report.driftedColumns.push({
            table: tableName,
            column: expectedCol.name,
            issue: 'nullability_mismatch',
            expected: String(expectedCol.nullable),
            actual: String(actualCol.nullable),
          });
        }
      }
    }

    if (this.tolerance === 'strict') {
      for (const [tableName] of actualMap) {
        if (!this.expected.has(tableName)) {
          report.extraTables.push(tableName);
        }
      }
    }

    report.hasDrift =
      report.missingTables.length > 0 ||
      report.driftedColumns.length > 0 ||
      (this.tolerance === 'strict' && report.extraTables.length > 0);

    return report;
  }

  assertNoDrift(actual: TableDefinition[]): void {
    const report = this.compare(actual);
    if (report.hasDrift) {
      const details = [
        ...report.missingTables.map(t => `Missing table: ${t}`),
        ...report.extraTables.map(t => `Extra table: ${t}`),
        ...report.driftedColumns.map(
          c => `${c.table}.${c.column}: ${c.issue} (expected: ${c.expected}, actual: ${c.actual})`,
        ),
      ].join('\n  ');
      throw new Error(`Schema drift detected:\n  ${details}`);
    }
  }
}
