export class PaginationMetaDto {
  readonly page: number;
  readonly limit: number;
  readonly totalCount: number;
  readonly totalPages: number;

  constructor(page: number, limit: number, totalCount: number) {
    this.page = page;
    this.limit = limit;
    this.totalCount = totalCount;
    this.totalPages = Math.ceil(totalCount / limit);
  }
}

export class PaginatedResponseDto<T> {
  readonly data: T[];
  readonly meta: PaginationMetaDto;

  constructor(data: T[], meta: PaginationMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
