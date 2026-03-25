import { ProductApiProps } from "./product-types"

import { useErrorStore } from "../../store/useErrorStatesStore"
import { useLoadingStore } from "../../store/useLoadingStatesStore"

import {ApiLoadingKey} from "../../store/useLoadingStatesStore"
import {ApiErrorKey} from "../../store/useErrorStatesStore"

import {useBookStore} from "../../store/books/useBookStatesStore"
import {useCharacterStore} from "../../store/characters/useCharacterStatesStore"
import {useCoverStore} from "../../store/covers/useCoverStatesStore"
import {usePageStore} from "../../store/pages/usePageStatesStore"



const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

const getCookieValue = (name: string): string | null => {
    if (typeof document === "undefined") {
        return null;
    }
    const cookie = document.cookie
        .split(";")
        .map((value) => value.trim())
        .find((value) => value.startsWith(`${name}=`));
    if (!cookie) {
        return null;
    }
    return decodeURIComponent(cookie.split("=").slice(1).join("="));
};

const ensureCsrfToken = async (): Promise<string | null> => {
    const existingToken = getCookieValue("csrftoken");
    if (existingToken) {
        return existingToken;
    }
    if (!API_BASE) {
        return null;
    }
    try {
        await fetch(API_BASE + "/product/books/init-create", {
            method: "GET",
            credentials: "include",
        });
    } catch {
        return null;
    }
    return getCookieValue("csrftoken");
};

const { setError, clearError } = useErrorStore.getState()
const { setLoading, clearLoading } = useLoadingStore.getState()
const { setBookList } = useBookStore.getState()
const { setCharacterList } = useCharacterStore.getState()
const { setCoverList } = useCoverStore.getState()
const { setPageList } = usePageStore.getState()

const PRODUCT_PATHS: Record<ProductApiProps["product"], string> = {
    books: "/product/books/",
    characters: "/product/characters/",
    cover: "/product/cover-versions/",
    "cover versions": "/product/cover-versions/",
    pages: "/product/pages/",
    "page versions": "/product/page-versions/",
    "character versions": "/product/character-versions/",
};

// fetch Books/Characters/Cover/Pages
const fetchProducts = async ({ method, id = null, bodyData = null, product, queryParams }: ProductApiProps) => {

    let errorProduct = "bookApi" as ApiErrorKey;
    let loadingProduct = "bookApi" as ApiLoadingKey;
    let endpoint = "";
    let body: ProductApiProps["bodyData"] = null;
    let setListProduct: any = setBookList; 
    
    if (product === "characters") {
        errorProduct = "characterApi";
        loadingProduct = "characterApi";
        setListProduct = setCharacterList;
    } else if (product === "character versions") {
        errorProduct = "characterVersionsApi";
        loadingProduct = "characterVersionsApi";
    } else if (product === "cover") {
        errorProduct = "coverVersionsApi";
        loadingProduct = "coverVersionsApi";
        setListProduct = setCoverList;
     } else if (product === "pages") {
        errorProduct = "pagesApi";
        loadingProduct = "pagesApi";
        setListProduct = setPageList;
     } else if (product === "page versions") {
        errorProduct = "pagesVersionsApi";
        loadingProduct = "pagesVersionsApi";
     }
    
    clearError(errorProduct);
    setLoading(loadingProduct, true);
    

    if (id) {
        endpoint = id + "/";
    }

    if ((method === "POST" || method === "PUT" || method === "PATCH") && bodyData) {
        body = bodyData
    }
    
    try {
        const methodUpper = method.toUpperCase();
        const requestInit: RequestInit = {
                method: methodUpper,
                credentials: 'include',
        };

        const headers: Record<string, string> = {};
        if (UNSAFE_METHODS.has(methodUpper)) {
            const csrfToken = await ensureCsrfToken();
            if (csrfToken) {
                headers["X-CSRFToken"] = csrfToken;
            }
        }

        if (body !== null && !(body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }

        if (Object.keys(headers).length > 0) {
            requestInit.headers = headers;
        }

        if (body !== null) {
            requestInit.body = body instanceof FormData ? body : JSON.stringify(body);
        }

        const searchParams = new URLSearchParams();
        if (queryParams) {
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value === null || value === undefined) {
                    return;
                }
                searchParams.append(key, String(value));
            });
        }

        const queryString = searchParams.toString();
        const productPath = PRODUCT_PATHS[product];
        const url = `${API_BASE}${productPath}${endpoint}${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url, requestInit);

        if (!response.ok) {
            let message = 'Failed to fetch data';
            try {
                const errorData = await response.json();
                message = errorData?.detail || message;
            } catch {}
            throw new Error(message);
        }

        if (response.status === 204) {
            return { ok: true };
        }

        const data = await response.json();

        if (method === "GET") {
            if (data?.Response === 'False') {
                setListProduct([] as any);
                setError(errorProduct, "Server Error, Please Come Back Later...")
                return null;
            }
            setListProduct(data);
        }

        return data;

        } catch (error) {
            const message = error instanceof Error ? error.message : "Server Error, Please Come Back Later...";
            setError(errorProduct, message)
            return null;
        } finally {
            clearLoading(loadingProduct);
        }
}



export default fetchProducts