import { ProductApiProps } from "./product-types"

import { useErrorStore } from "../../store/useErrorStatesStore"
import { useLoadingStore } from "../../store/useLoadingStatesStore"

import {useBookStore} from "../../store/books/useBookStatesStore"

import { BookApiFieldsPost, BookApiFieldsPut, BookApiFieldsPatch, BookApiFieldsGet } from "./product-types"
import { UseBoundStore } from "zustand"



const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

const { setError, clearError } = useErrorStore.getState()
const { setLoading, clearLoading } = useLoadingStore.getState()
const { setBookList } = useBookStore.getState()

// fetch Books/Characters/Cover/Pages
const fetchProducts = async ({ method, id = null, bodyData = null, product }: ProductApiProps) => {

    let errorProduct = "bookApi"
    let loadingProduct ="bookApi"
    let endpoint = '';
    let body: object | null = {};
    let setListProduct: any = setBookList; 
    
    if (product === "characters") {
        errorProduct = "characterApi"
        loadingProduct = "characterApi"
        setListProduct = setCharacterList
    } else if (product === "cover") {
        errorProduct = "coverApi"
        loadingProduct = "coverApi"
        setListProduct = setCoverList
     } else if (product === "pages") {
        errorProduct = "pagesApi"
        loadingProduct = "pagesApi"
        setListProduct = setPageList
     }
    
    clearError(errorProduct)
    setLoading(loadingProduct, true);
    

    if (id) {
        endpoint = "/" + id;
    }

    if (method === "POST" || method === "PUT" || method === "PATCH" && bodyData) {
        body = bodyData
    }
    
    try {
        const response = await fetch(API_BASE + "/books" + endpoint, {
                method: method.toUpperCase(),
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: JSON.stringify(body), 
        });

        if (!response.ok) throw new Error('Failed to fetch books');

        const data = await response.json();

        if (method === "GET") {
            if (data.Response === 'False') {
                setBookList({} as BookApiFieldsGet);
                setError("bookApi", "Server Error, Please Come Back Later...")
                return;
            }
            setBookList(data);
        }

        } catch (error) {
            setError("bookApi", "Server Error, Please Come Back Later...")
        } finally {
            clearLoading("bookApi");
        }
}



export default fetchProducts