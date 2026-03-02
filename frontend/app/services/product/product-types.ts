export type ProductApiProps = {
    method: 'GET' | "POST" | "PUT" | "PATCH" | "DELETE";
    id: null | string;
    bodyData: BookApiFieldsPost | BookApiFieldsPatch | null;
    product: 'books' | 'cover' | 'cover versions' | 'characters' | 'character versions' | 'pages' | 'page versions'
};

export type CharacterApiProps = Omit<ProductApiProps, 'bodyData'> & { bodyData: CharacterApiFieldsPost | CharacterApiFieldsPatch | null };

export type CoverApiProps = Omit<ProductApiProps, 'bodyData'> & { bodyData: CharacterVersionApiFieldsPost | CharacterVersionApiFieldsPost | null };

export type PageApiProps = Omit<ProductApiProps, 'bodyData'> & { bodyData: PageApiFieldsPost | PageApiFieldsPost | null };

type NullableString = string | null;
type NullableNumber = number | null

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
    book: string;
    name: string;
    reference_photo: NullableString;
};

export type CharacterApiFieldsPost = CharacterBaseFields;
export type CharacterApiFieldsPut = CharacterBaseFields;
export type CharacterApiFieldsPatch = Partial<CharacterBaseFields>;

export type CharacterApiFieldsGet = CharacterBaseFields & {
    id: string;
    current_version: NullableString;
    total_generation_attempts: number;
    free_retry_used: boolean;
    created_at: string;
    updated_at: string;
};

// Character types END

// Character version types
export type CharacterVersionBaseFields = {
    character: string;
    prompt_snapshot: string;
    aspect_ratio: string;
    generation_job_id: string;
    thumbnail: NullableString;
    seed: NullableString;
};

export type CharacterVersionApiFieldsPost = CharacterVersionBaseFields;
export type CharacterVersionApiFieldsPut = CharacterVersionBaseFields;
export type CharacterVersionApiFieldsPatch = Partial<CharacterVersionBaseFields>;

export type CharacterVersionApiFieldsGet = CharacterVersionBaseFields & {
    id: string;
    version_number: NullableNumber;
    generated_image: NullableString;
    generation_cost_usd: NullableString;
    ledger_entry: NullableString;
    status: GenerationStatus;
    error_message: NullableString;
    generation_time_ms: NullableNumber;
    created_at: string;
    nano_request_id: NullableString;
};

// Character version types END

// Cover version types
export type CoverVersionBaseFields = {
    book: string;
    title_text: string;
    prompt_snapshot: string;
    aspect_ratio: NullableString;
    generation_job_id: string;
    subtitle_text: NullableString;
    author_name: NullableString;
    title_position: NullableString;
    thumbnail: NullableString;
    seed: NullableString;
};

export type CoverVersionApiFieldsPost = CoverVersionBaseFields;
export type CoverVersionApiFieldsPut = CoverVersionBaseFields;
export type CoverVersionApiFieldsPatch = Partial<CoverVersionBaseFields>;

export type CoverVersionApiFieldsGet = CoverVersionBaseFields & {
    id: string;
    generated_image: NullableString;
    full_spread_image: NullableString;
    version_number: NullableNumber;
    ledger_entry: NullableString;
    generation_job_id: string;
    generation_cost_usd: NullableString;
    status: GenerationStatus;
    error_message: NullableString;
    nano_request_id: NullableString;
    created_at: string;
    updated_at: string;
};

// Cover version types END


// Page types
export type PageBaseFields = {
    book: string;
    title_text: string;
    prompt_snapshot: string;
    aspect_ratio: NullableString;
    generation_job_id: string;
    subtitle_text: NullableString;
    author_name: NullableString;
    title_position: NullableString;
    thumbnail: NullableString;
    seed: NullableString;
};

export type PageApiFieldsPost = PageBaseFields;
export type PageApiFieldsPut = PageBaseFields;
export type PageApiFieldsPatch = Partial<PageBaseFields>;

export type PageApiFieldsGet = PageBaseFields & {
    id: string;
    generated_image: NullableString;
    full_spread_image: NullableString;
    version_number: NullableNumber;
    ledger_entry: NullableString;
    generation_job_id: string;
    generation_cost_usd: NullableString;
    status: GenerationStatus;
    error_message: NullableString;
    nano_request_id: NullableString;
    created_at: string;
    updated_at: string;
};

// Page types END


// Page version types
export type PageVersionBaseFields = {
    book: string;
    title_text: string;
    prompt_snapshot: string;
    aspect_ratio: NullableString;
    generation_job_id: string;
    subtitle_text: NullableString;
    author_name: NullableString;
    title_position: NullableString;
    thumbnail: NullableString;
    seed: NullableString;
};

export type PageVersionApiFieldsPost = PageVersionBaseFields;
export type PageVersionApiFieldsPut = PageVersionBaseFields;
export type PageVersionApiFieldsPatch = Partial<PageVersionBaseFields>;

export type PageVersionApiFieldsGet = PageVersionBaseFields & {
    id: string;
    generated_image: NullableString;
    full_spread_image: NullableString;
    version_number: NullableNumber;
    ledger_entry: NullableString;
    generation_job_id: string;
    generation_cost_usd: NullableString;
    status: GenerationStatus;
    error_message: NullableString;
    nano_request_id: NullableString;
    created_at: string;
    updated_at: string;
};

// Page version types END