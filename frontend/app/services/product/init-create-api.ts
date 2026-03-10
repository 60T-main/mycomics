import { useErrorStore } from "../../store/useErrorStatesStore"
import { useLoadingStore } from "../../store/useLoadingStatesStore"

import { ApiLoadingKey } from "../../store/useLoadingStatesStore"
import { ApiErrorKey } from "../../store/useErrorStatesStore"



const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

const { setError, clearError } = useErrorStore.getState()
const { setLoading, clearLoading } = useLoadingStore.getState()

// fetch books/initCreate to check if user already createad a book 
const fetchInitCreate = async () => {

    let errorProduct = "initCreateApi" as ApiErrorKey;
    let loadingProduct = "initCreateApi" as ApiLoadingKey;
    
    clearError(errorProduct);
    setLoading(loadingProduct, true);
    
    
    try {
        const response = await fetch(API_BASE + "/product/books/init-create" , {
                method: "GET",
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (!response.ok) throw new Error('Failed to fetch init-create response');

        const data = await response.json();


        if (data.Response === 'False') {
            setError(errorProduct, "Server Error, Please Come Back Later...")
            return;
        }

        return data


        } catch (error) {
            setError(errorProduct, "Server Error, Please Come Back Later...")
        } finally {
            clearLoading(loadingProduct);
        }
}



export default fetchInitCreate