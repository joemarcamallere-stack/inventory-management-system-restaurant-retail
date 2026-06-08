export declare class PaginationDto {
    page?: number;
    limit?: number;
}
export type PaginatedResult<T> = {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};
export declare function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T>;
