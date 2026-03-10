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

const { setError, clearError } = useErrorStore.getState()
const { setLoading, clearLoading } = useLoadingStore.getState()
const { setBookList } = useBookStore.getState()
const { setCharacterList } = useCharacterStore.getState()
const { setCoverList } = useCoverStore.getState()
const { setPageList } = usePageStore.getState()

// fetch Books/Characters/Cover/Pages
const fetchProducts = async ({ method, id = null, bodyData = null, product }: ProductApiProps) => {

    let errorProduct = "bookApi" as ApiErrorKey;
    let loadingProduct = "bookApi" as ApiLoadingKey;
    let endpoint = ''; 
    let body: object | null = null;
    let setListProduct: any = setBookList; 
    
    if (product === "characters") {
        errorProduct = "characterApi";
        loadingProduct = "characterApi";
        setListProduct = setCharacterList;
    } else if (product === "cover") {
        errorProduct = "coverVersionsApi";
        loadingProduct = "coverVersionsApi";
        setListProduct = setCoverList;
     } else if (product === "pages") {
        errorProduct = "pagesApi";
        loadingProduct = "pagesApi";
        setListProduct = setPageList;
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
        const requestInit: RequestInit = {
                method: method.toUpperCase(),
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
        };

        if (body !== null) {
            requestInit.body = JSON.stringify(body);
        }

        const response = await fetch(API_BASE + "/product/books/" + endpoint, requestInit);

        if (!response.ok) throw new Error('Failed to fetch books');

        const data = await response.json();

        if (method === "GET") {
            if (data.Response === 'False') {
                setListProduct({} as any);
                setError(errorProduct, "Server Error, Please Come Back Later...")
                return null;
            }
            setListProduct(data);
        }

        return data;

        } catch (error) {
            setError(errorProduct, "Server Error, Please Come Back Later...")
            return null;
        } finally {
            clearLoading(loadingProduct);
        }
}



export default fetchProducts