export class MeasuresGenerator {
  expectedMeasureRecords: bigint;
  leaf_members_matrix: any[][];
  range_counters: bigint[];

  constructor(records_count_str: string) {
    this.expectedMeasureRecords = BigInt(records_count_str);
    this.leaf_members_matrix = [];
    this.range_counters = [];
  }

  push(leaf_members: any[]): void {
    this.leaf_members_matrix.push(leaf_members);
    this.range_counters.push(0n);
  }

  adjust_beginning_position(beginning_position_str: string): void {
    // take the totalElements - leaf-vectors capacity of the virtual cube
    let totalElements = 1n;
    for (let i = 0; i < this.leaf_members_matrix.length; i++) {
      totalElements *= BigInt(this.leaf_members_matrix[i].length);
    }

    const beginning_position = BigInt(beginning_position_str);

    // if the ending position exceeds the total possible records, exit the process
    if (beginning_position + this.expectedMeasureRecords > totalElements) {
      console.error(
        `[Error] [process.exit(1);] Beginning position ${beginning_position} exceeds total possible records ${totalElements}.`
      );
      process.exit(1);
    }

    // 计算在第一次next()调用前，range_counters的起始位置应该是多少
    const offsets: bigint[] = new Array(this.leaf_members_matrix.length).fill(
      1n
    );
    for (let i = this.leaf_members_matrix.length - 2; i >= 0; i--) {
      offsets[i] =
        offsets[i + 1] * BigInt(this.leaf_members_matrix[i + 1].length);
    }

    let beg_pos = beginning_position;
    for (let i = 0; i < this.leaf_members_matrix.length; i++) {
      // this.range_counters[i] = BigInt(beg_pos.toString()) / BigInt(offsets[i]);
      // this.range_counters[i] = beg_pos / BigInt(offsets[i]);
      this.range_counters[i] = beg_pos / offsets[i];

      // beg_pos = BigInt(beg_pos.toString()) % BigInt(offsets[i]);
      beg_pos %= offsets[i];

      if (beg_pos === 0n) break;
    }
  }

  next(): any[] | null {
    if (this.expectedMeasureRecords === 0n) return null;

    const vector_pos: any[] = [];
    for (let i = 0; i < this.range_counters.length; i++) {
      vector_pos.push(
        this.leaf_members_matrix[i][Number(this.range_counters[i])]
      );
    }

    for (let j = 0; j < this.range_counters.length; j++) {
      const i = this.range_counters.length - (j + 1);
      if (
        this.range_counters[i] < BigInt(this.leaf_members_matrix[i].length - 1)
      ) {
        // this.range_counters[i] = this.range_counters[i] + 1n;
        this.range_counters[i]++;
        break;
      }
      this.range_counters[i] = 0n;
    }

    this.expectedMeasureRecords--;
    return vector_pos;
  }
}
