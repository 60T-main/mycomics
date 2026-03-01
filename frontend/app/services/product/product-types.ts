export type ProductApiProps = {
    method: 'GET' | "POST" | "PUT" | "PATCH" | "DELETE";
    id: null | string;
    bodyData: BookApiFieldsPost | BookApiFieldsPatch | null;
};

type CharacterApiProps = Omit<ProductApiProps, 'bodyData'> & { bodyData: CharacterApiFieldsPost | CharacterApiFieldsPatch | null };

type NullableString = string | null

type BookStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETE" | "LOCKED" | "ORDERED" | "PRINTED" | "ARCHIVED";

export type GenerationStatus = "PENDING" | "GENERATING" | "SUCCESS" | "FAILED";
export type PageGenerationStatus = "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";


// Book Types 
export type BookBaseFields = {
    title: string;
    art_style: string;
    style_version: NullableString;
    print_size: NullableString;
    paper_type: NullableString;
    binding_type: NullableString;
};

export type BookApiFieldsPost = BookBaseFields;
export type BookApiFieldsPut = BookBaseFields;
export type BookApiFieldsPatch = Partial<BookBaseFields>;

export type BookApiFieldsGet = BookBaseFields & {
    id: string;
    slug: NullableString;
    created_at: string;
    status: BookStatus;
    total_pages: number;
    last_generation_at: NullableString;
    current_cover_version: NullableString;
    is_print_ready: boolean;
    print_locked_at: NullableString;
    is_consistency_verified: boolean;
    total_images_generated: number;
    total_generation_cost_usd: string | number;
    is_archived: boolean;
    archived_at: NullableString;
};


// Book Types END


// Character types
export type CharacterBaseFields = {
    title: string;
    art_style: string;
    style_version: NullableString;
    print_size: NullableString;
    paper_type: NullableString;
    binding_type: NullableString;
};

export type CharacterApiFieldsPost = CharacterBaseFields;
export type CharacterApiFieldsPut = CharacterBaseFields;
export type CharacterApiFieldsPatch = Partial<CharacterBaseFields>;

export type CharacterApiFieldsGet = CharacterBaseFields & {
    id: string;
    slug: NullableString;
    created_at: string;
    status: BookStatus;
    total_pages: number;
    last_generation_at: NullableString;
    current_cover_version: NullableString;
    is_print_ready: boolean;
    print_locked_at: NullableString;
    is_consistency_verified: boolean;
    total_images_generated: number;
    total_generation_cost_usd: string | number;
    is_archived: boolean;
    archived_at: NullableString;
};

// Character types END