export type AuthenticatedUser = {
    id: string;
    email: string;
    role: string;
    businessId: string;
    modules: string[];
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
