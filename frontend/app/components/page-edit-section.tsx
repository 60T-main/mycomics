"use client";

import {
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ConfirmationModal from "./confirmation-modal";
import ImageLightboxModal from "./image-lightbox-modal";
import ImageUpload from "./image-upload";

import fetchProducts from "../services/product/product-api";
import {
  BookApiFieldsGet,
  CharacterApiFieldsGet,
  CoverVersionApiFieldsGet,
  PageApiFieldsGet,
  PageVersionApiFieldsGet,
} from "../services/product/product-types";

import { useBookStore } from "../store/books/useBookStatesStore";
import { useErrorStore } from "../store/useErrorStatesStore";

// type BuildMode = "single" | "detailed";
type DetailedInputMode = "text" | "image";

type DetailedPageDraft = {
  pageNumber: number;
  theme: string;
  mode: DetailedInputMode;
  prompt: string;
  dialogueHint: string;
  imageUploaded: boolean;
};

type PreparedPage = {
  pageNumber: number;
  theme: string;
  mode: DetailedInputMode;
  previewText: string;
};

type RetryPackCreateResponse = {
  order_id: string;
  retry_pack_order_id: string;
  amount_gel: number;
};

type RetryPackApplyResponse = {
  content_type: string;
  content_id: string;
  max_retries: number;
  used_retries: number;
};

const TOTAL_PAGES = 8;
const PAGE_MIN_WORDS = 5;
const PAGE_MAX_WORDS = 200;
const PAGE_RETRY_BASE_LIMIT = 3;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const getBackendOrigin = () => {
  if (!API_BASE) {
    return "";
  }
  return API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
};

const resolveImageUrl = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${getBackendOrigin()}${value}`;
  }
  return `${getBackendOrigin()}/${value}`;
};

const PAGE_THEMES = [
  "დრამატული",
  "სათავგადასავლო",
  "რომანტიკული",
  "იუმორისტული",
  "საიდუმლო",
  "ფენტეზი",
];

const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;

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

const ensureCsrfToken = async () => {
  const existingToken = getCookieValue("csrftoken");
  if (existingToken) {
    return existingToken;
  }
  if (!API_BASE) {
    return null;
  }
  await fetch(`${API_BASE}/product/books/init-create`, {
    method: "GET",
    credentials: "include",
  });
  return getCookieValue("csrftoken");
};

const mapCoverTemplateToPageTheme = (template: string | null) => {
  if (!template) {
    return "";
  }
  const mapping: Record<string, string> = {
    heroic: "სათავგადასავლო",
    dramatic: "დრამატული",
    romantic: "რომანტიკული",
    fun: "იუმორისტული",
  };
  return mapping[template] || "";
};

const toPromptPreview = (prompt: unknown) => {
  if (typeof prompt !== "string") {
    return "";
  }
  return prompt.replace(/\s+/g, " ").trim();
};

export default function PageEditSection() {
  const { bookState } = useBookStore();
  const { errors } = useErrorStore();

  const bookId = bookState?.book?.id ?? null;

  const [bookData, setBookData] = useState<BookApiFieldsGet | null>(null);
  const [coverTheme, setCoverTheme] = useState<string>("");
  const [useCoverTheme, setUseCoverTheme] = useState(true);
  const [bookCharacters, setBookCharacters] = useState<CharacterApiFieldsGet[]>(
    [],
  );
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    [],
  );

  const [existingPages, setExistingPages] = useState<PageApiFieldsGet[]>([]);
  const [pageVersions, setPageVersions] = useState<PageVersionApiFieldsGet[]>(
    [],
  );

  const [imageUploadPreviews, setImageUploadPreviews] = useState<string[]>([]);
  const [, setImageUploadFiles] = useState<File[]>([]);

  const [retryByPage, setRetryByPage] = useState<
    Record<number, { used: number; max: number }>
  >({});
  const [pendingRetryPackByPage, setPendingRetryPackByPage] = useState<
    Record<number, string>
  >({});
  const [pendingRetryOrderByPage, setPendingRetryOrderByPage] = useState<
    Record<number, string>
  >({});

  const [isGeneratingPage, setIsGeneratingPage] = useState(false);
  const [isProcessingRetryPack, setIsProcessingRetryPack] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const pagePreviewTopRef = useRef<HTMLDivElement | null>(null);

  const [detailedDraft, setDetailedDraft] = useState<DetailedPageDraft>({
    pageNumber: 1,
    theme: "",
    mode: "text",
    prompt: "",
    dialogueHint: "",
    imageUploaded: false,
  });

  const [preparedPages, setPreparedPages] = useState<PreparedPage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const handleImageUploadedChange = useCallback(
    (value: SetStateAction<boolean>) => {
      setDetailedDraft((prev) => {
        const nextValue =
          typeof value === "function" ? value(prev.imageUploaded) : value;

        if (nextValue === prev.imageUploaded) {
          return prev;
        }

        return {
          ...prev,
          imageUploaded: nextValue,
        };
      });
    },
    [],
  );

  const detailedPromptWordCount = useMemo(
    () => countWords(detailedDraft.prompt),
    [detailedDraft.prompt],
  );

  const selectedPage = useMemo(
    () =>
      existingPages.find(
        (page) => page.page_number === detailedDraft.pageNumber,
      ) || null,
    [existingPages, detailedDraft.pageNumber],
  );

  const selectedPageVersions = useMemo(
    () =>
      pageVersions.filter(
        (version) => String(version.page) === String(selectedPage?.id),
      ),
    [pageVersions, selectedPage?.id],
  );

  const selectedPageLatestVersion = useMemo(() => {
    if (selectedPageVersions.length === 0) {
      return null;
    }
    return [...selectedPageVersions].sort(
      (a, b) => (b.version_number || 0) - (a.version_number || 0),
    )[0];
  }, [selectedPageVersions]);

  const selectedPageRetry = retryByPage[detailedDraft.pageNumber] || {
    used: Math.max(selectedPageVersions.length - 1, 0),
    max: PAGE_RETRY_BASE_LIMIT,
  };
  const hasExistingVersionSelected = selectedPageVersions.length > 0;

  const isPaidUser = Boolean(bookData?.pricing_tier);
  const retryLimitReached = selectedPageRetry.used >= selectedPageRetry.max;
  const effectiveTheme = useCoverTheme ? coverTheme : detailedDraft.theme;

  const sortedPreparedPages = useMemo(
    () => [...preparedPages].sort((a, b) => a.pageNumber - b.pageNumber),
    [preparedPages],
  );

  const selectedPagePreviewImage = resolveImageUrl(
    selectedPageLatestVersion?.thumbnail || null,
  );

  const setPreparedFromVersions = (
    pages: PageApiFieldsGet[],
    versions: PageVersionApiFieldsGet[],
  ) => {
    const latestByPage = new Map<number, PageVersionApiFieldsGet>();

    versions.forEach((version) => {
      const page = pages.find(
        (item) => String(item.id) === String(version.page),
      );
      if (!page) {
        return;
      }

      const pageNumber = page.page_number;
      const current = latestByPage.get(pageNumber);
      if (
        !current ||
        (version.version_number || 0) > (current.version_number || 0)
      ) {
        latestByPage.set(pageNumber, version);
      }
    });

    const nextPrepared: PreparedPage[] = [];
    latestByPage.forEach((version, pageNumber) => {
      nextPrepared.push({
        pageNumber,
        theme: "-",
        mode: "text",
        previewText: toPromptPreview(version.prompt),
      });
    });

    setPreparedPages(nextPrepared);
  };

  const setRetryMapFromVersions = (
    pages: PageApiFieldsGet[],
    versions: PageVersionApiFieldsGet[],
  ) => {
    const retryMap: Record<number, { used: number; max: number }> = {};

    versions.forEach((version) => {
      const page = pages.find(
        (item) => String(item.id) === String(version.page),
      );
      if (!page) {
        return;
      }
      const pageNumber = page.page_number;
      if (!retryMap[pageNumber]) {
        retryMap[pageNumber] = { used: 0, max: PAGE_RETRY_BASE_LIMIT };
      }
      retryMap[pageNumber].used += 1;
    });

    Object.keys(retryMap).forEach((pageNumber) => {
      const num = Number(pageNumber);
      retryMap[num].used = Math.max(retryMap[num].used - 1, 0);
    });

    setRetryByPage(retryMap);
  };

  const handleToggleCharacter = (characterId: string) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(characterId)
        ? prev.filter((id) => id !== characterId)
        : [...prev, characterId],
    );
  };

  const getCharacterPreviewImage = (character: CharacterApiFieldsGet) =>
    resolveImageUrl(
      character.reference_photos?.[0] || character.reference_photo || null,
    );

  const loadContext = async () => {
    if (!bookId) {
      return;
    }

    const [
      bookResponse,
      pagesResponse,
      versionsResponse,
      coversResponse,
      charactersResponse,
    ] = await Promise.all([
      fetchProducts({
        method: "GET",
        id: bookId,
        bodyData: null,
        product: "books",
      }),
      fetchProducts({
        method: "GET",
        id: null,
        bodyData: null,
        product: "pages",
        queryParams: { book_id: bookId },
      }),
      fetchProducts({
        method: "GET",
        id: null,
        bodyData: null,
        product: "page versions",
        queryParams: { book_id: bookId },
      }),
      fetchProducts({
        method: "GET",
        id: null,
        bodyData: null,
        product: "cover",
        queryParams: { book_id: bookId },
      }),
      fetchProducts({
        method: "GET",
        id: null,
        bodyData: null,
        product: "characters",
        queryParams: { book_id: bookId },
      }),
    ]);

    if (bookResponse) {
      setBookData(bookResponse as BookApiFieldsGet);
    }

    const typedPages = Array.isArray(pagesResponse)
      ? (pagesResponse as PageApiFieldsGet[])
      : [];
    const typedVersions = Array.isArray(versionsResponse)
      ? (versionsResponse as PageVersionApiFieldsGet[])
      : [];

    setExistingPages(typedPages);
    setPageVersions(typedVersions);
    setPreparedFromVersions(typedPages, typedVersions);
    setRetryMapFromVersions(typedPages, typedVersions);

    const typedCharacters = Array.isArray(charactersResponse)
      ? (charactersResponse as CharacterApiFieldsGet[])
      : [];
    setBookCharacters(typedCharacters);
    setSelectedCharacterIds(typedCharacters.map((character) => character.id));

    if (Array.isArray(coversResponse) && coversResponse.length > 0) {
      const latestCover = [
        ...(coversResponse as CoverVersionApiFieldsGet[]),
      ].sort((a, b) => (b.version_number || 0) - (a.version_number || 0))[0];

      const snapshot = latestCover.prompt_snapshot as
        | Record<string, unknown>
        | null
        | undefined;

      const template =
        (snapshot?.input as Record<string, unknown> | undefined)?.template ||
        snapshot?.template;

      const mappedTheme = mapCoverTemplateToPageTheme(
        typeof template === "string" ? template : null,
      );
      if (mappedTheme) {
        setCoverTheme(mappedTheme);
      }
    }
  };

  useEffect(() => {
    loadContext();
  }, [bookId]);

  const ensurePageExists = async (pageNumber: number) => {
    const existing = existingPages.find(
      (item) => item.page_number === pageNumber,
    );
    if (existing) {
      return existing.id;
    }
    if (!bookId) {
      return null;
    }

    const created = await fetchProducts({
      method: "POST",
      id: null,
      bodyData: {
        book_id: bookId,
        book: bookId,
        page_number: pageNumber,
        scene_description: "",
        text_content: "",
      },
      product: "pages",
    });

    if (!created) {
      return null;
    }

    const typed = created as PageApiFieldsGet;
    setExistingPages((prev) => [...prev, typed]);
    return typed.id;
  };

  const createRetryPackOrder = async (pageId: string) => {
    if (!API_BASE) {
      throw new Error("API base URL is not configured.");
    }

    const csrfToken = await ensureCsrfToken();
    const response = await fetch(`${API_BASE}/orders/retry-pack/create/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: JSON.stringify({
        content_type: "PAGE",
        content_id: pageId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || "Retry pack order creation failed.");
    }

    return data as RetryPackCreateResponse;
  };

  const applyRetryPack = async (pageId: string, retryPackOrderId: string) => {
    if (!API_BASE) {
      throw new Error("API base URL is not configured.");
    }

    const csrfToken = await ensureCsrfToken();
    const response = await fetch(`${API_BASE}/product/retries/add/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: JSON.stringify({
        content_type: "PAGE",
        content_id: pageId,
        retry_pack_order_id: retryPackOrderId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || "Retry pack apply failed.");
    }

    return data as RetryPackApplyResponse;
  };

  const submitDetailedGeneration = async () => {
    if (!bookId) {
      setErrorMessage("ჯერ შექმენი წიგნი.");
      return false;
    }

    // if (!isPaidUser) {
    //   setErrorMessage(
    //     "გვერდების გენერაცია ხელმისაწვდომია მხოლოდ ფასიანი მომხმარებლისთვის.",
    //   );
    //   return false;
    // }

    if (!effectiveTheme) {
      setErrorMessage("აირჩიე გვერდის თემა.");
      return false;
    }

    if (retryLimitReached) {
      setErrorMessage(
        "ამ გვერდისთვის ცდების ლიმიტი ამოიწურა. შეიძინე +3 ცდა (1 GEL).",
      );
      return false;
    }

    if (detailedDraft.mode === "text") {
      if (
        detailedPromptWordCount < PAGE_MIN_WORDS ||
        detailedPromptWordCount > PAGE_MAX_WORDS
      ) {
        setErrorMessage(
          `გვერდის პრომპტი უნდა იყოს ${PAGE_MIN_WORDS}-${PAGE_MAX_WORDS} სიტყვას შორის.`,
        );
        return false;
      }

      if (selectedCharacterIds.length === 0) {
        setErrorMessage("აირჩიე მინიმუმ ერთი პერსონაჟი ტექსტური გვერდისთვის.");
        return false;
      }
    }

    if (detailedDraft.mode === "image" && !detailedDraft.imageUploaded) {
      setErrorMessage("ატვირთე ფოტო ან გადადი ტექსტურ რეჟიმზე.");
      return false;
    }

    setIsGeneratingPage(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    const pageId = await ensurePageExists(detailedDraft.pageNumber);
    if (!pageId) {
      setErrorMessage(errors.pagesApi || "გვერდის შექმნა ვერ მოხერხდა.");
      setIsGeneratingPage(false);
      return false;
    }

    const promptPayload =
      detailedDraft.mode === "text"
        ? `თემა: ${effectiveTheme}\n\n${detailedDraft.prompt}`
        : `თემა: ${effectiveTheme}\n\nფოტოზე დაფუძნებული გვერდი. ${
            detailedDraft.dialogueHint || ""
          }`;

    const createdVersion = (await fetchProducts({
      method: "POST",
      id: null,
      bodyData: {
        page: pageId,
        book_id: bookId,
        prompt: promptPayload,
        requested_character_ids:
          detailedDraft.mode === "text" ? selectedCharacterIds : [],
      },
      product: "page versions",
    })) as
      | (PageVersionApiFieldsGet & {
          used_retries?: number;
          max_retries?: number;
        })
      | null;

    if (!createdVersion) {
      setErrorMessage(
        errors.pagesVersionsApi || "გვერდის გენერაცია ვერ მოხერხდა.",
      );
      setIsGeneratingPage(false);
      return false;
    }

    setPageVersions((prev) => [createdVersion, ...prev]);
    setPreparedPages((prev) => {
      const previewText =
        detailedDraft.mode === "text"
          ? detailedDraft.prompt
          : detailedDraft.dialogueHint || "ფოტოზე დაფუძნებული გვერდი";

      const nextPage: PreparedPage = {
        pageNumber: detailedDraft.pageNumber,
        theme: effectiveTheme,
        mode: detailedDraft.mode,
        previewText,
      };

      const exists = prev.some(
        (item) => item.pageNumber === nextPage.pageNumber,
      );
      if (!exists) {
        return [...prev, nextPage];
      }

      return prev.map((item) =>
        item.pageNumber === nextPage.pageNumber ? nextPage : item,
      );
    });

    if (
      typeof createdVersion.used_retries === "number" &&
      typeof createdVersion.max_retries === "number"
    ) {
      setRetryByPage((prev) => ({
        ...prev,
        [detailedDraft.pageNumber]: {
          used: createdVersion.used_retries || 0,
          max: createdVersion.max_retries || PAGE_RETRY_BASE_LIMIT,
        },
      }));
    } else {
      setRetryByPage((prev) => {
        const current = prev[detailedDraft.pageNumber] || {
          used: 0,
          max: PAGE_RETRY_BASE_LIMIT,
        };
        return {
          ...prev,
          [detailedDraft.pageNumber]: {
            used: current.used + 1,
            max: current.max,
          },
        };
      });
    }

    setImageUploadPreviews([]);
    setImageUploadFiles([]);
    setDetailedDraft((prev) => ({ ...prev, imageUploaded: false }));
    setNoticeMessage("გვერდის გენერაცია წარმატებით დასრულდა.");
    setIsGeneratingPage(false);
    requestAnimationFrame(() => {
      pagePreviewTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return true;
  };

  const handleDetailedModeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (hasExistingVersionSelected) {
      setIsReplaceModalOpen(true);
      return;
    }

    submitDetailedGeneration().catch((error: unknown) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "გვერდის გენერაცია ვერ მოხერხდა.",
      );
      setIsGeneratingPage(false);
    });
  };

  const handleConfirmReplace = () => {
    setIsReplaceModalOpen(false);
    submitDetailedGeneration().catch((error: unknown) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "გვერდის გენერაცია ვერ მოხერხდა.",
      );
      setIsGeneratingPage(false);
    });
  };

  const handleCreateRetryPackOrder = async () => {
    if (!selectedPage) {
      setErrorMessage("პირველ რიგში ერთხელ მაინც დააგენერირე ეს გვერდი.");
      return;
    }

    setIsProcessingRetryPack(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const data = await createRetryPackOrder(selectedPage.id);
      setPendingRetryPackByPage((prev) => ({
        ...prev,
        [detailedDraft.pageNumber]: data.retry_pack_order_id,
      }));
      setPendingRetryOrderByPage((prev) => ({
        ...prev,
        [detailedDraft.pageNumber]: data.order_id,
      }));

      setNoticeMessage(
        `Retry შეკვეთა შეიქმნა (#${data.order_id}). გადაიხადე 1 GEL და შემდეგ დააჭირე "Retry ცდების განახლება".`,
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Retry pack შექმნა ვერ მოხერხდა.",
      );
    } finally {
      setIsProcessingRetryPack(false);
    }
  };

  const handleApplyRetryPack = async () => {
    const retryPackOrderId = pendingRetryPackByPage[detailedDraft.pageNumber];
    if (!retryPackOrderId || !selectedPage) {
      return;
    }

    setIsProcessingRetryPack(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const data = await applyRetryPack(selectedPage.id, retryPackOrderId);
      setRetryByPage((prev) => ({
        ...prev,
        [detailedDraft.pageNumber]: {
          used: data.used_retries,
          max: data.max_retries,
        },
      }));

      setPendingRetryPackByPage((prev) => {
        const next = { ...prev };
        delete next[detailedDraft.pageNumber];
        return next;
      });
      setPendingRetryOrderByPage((prev) => {
        const next = { ...prev };
        delete next[detailedDraft.pageNumber];
        return next;
      });

      setNoticeMessage(
        "რედაქტირებები წარმატებით განახლდა (+3). შეგიძლია გაგრძელება.",
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "რედაქტირებების გამოყენება ვერ მოხერხდა.",
      );
    } finally {
      setIsProcessingRetryPack(false);
    }
  };

  const getPreparedPagePreviewImage = (pageNumber: number) => {
    const preparedPage = existingPages.find(
      (page) => page.page_number === pageNumber,
    );
    if (!preparedPage) {
      return null;
    }

    const latestVersion = pageVersions
      .filter((version) => String(version.page) === String(preparedPage.id))
      .sort((a, b) => (b.version_number || 0) - (a.version_number || 0))[0];

    return resolveImageUrl(latestVersion?.thumbnail || null);
  };

  const selectPageForEditing = (pageNumber: number) => {
    setDetailedDraft((prev) => ({
      ...prev,
      pageNumber,
    }));

    requestAnimationFrame(() => {
      pagePreviewTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const nextEmptyPageNumber = (() => {
    const preparedSet = new Set(
      sortedPreparedPages.map((page) => page.pageNumber),
    );
    for (let pageNumber = 1; pageNumber <= TOTAL_PAGES; pageNumber += 1) {
      if (!preparedSet.has(pageNumber)) {
        return pageNumber;
      }
    }
    return null;
  })();

  const preparedCount = sortedPreparedPages.length;

  return (
    <>
      <section
        id="tab-pages"
        role="tabpanel"
        aria-labelledby="tab-pages-btn"
        className="edit-section"
      >
        <article className="cover-article lg:w-7/10 xl:w-6/10 mb-12">
          <h2>ნაბიჯი 4/4 • გვერდების დამატება</h2>

          <div className="w-full flex flex-col items-center justify-center gap-6 lg:gap-10 px-6 py-6 lg:py-8">
            <div ref={pagePreviewTopRef} className="w-full max-w-3xl" />

            <ConfirmationModal
              isOpen={isReplaceModalOpen}
              title="გვერდის შეცვლის დადასტურება"
              message="დარწმუნებული ხართ, რომ ამ გვერდის თავიდან გენერაცია გსურთ? ეს მოქმედება 1 ცდას გამოიყენებს."
              confirmLabel="დიახ, შეცვლა"
              cancelLabel="გაუქმება"
              onConfirm={handleConfirmReplace}
              onCancel={() => setIsReplaceModalOpen(false)}
            />

            {selectedPagePreviewImage && (
              <div className="w-full rounded-2xl border-2 border-neutral-200 bg-white px-4 py-4 flex flex-col items-center gap-2">
                <p className="font-bold mb-2 !text-sm">
                  გვერდი {detailedDraft.pageNumber}
                </p>
                <img
                  src={selectedPagePreviewImage}
                  alt={`გვერდი ${detailedDraft.pageNumber}`}
                  className="w-full max-w-md rounded-xl border-2 object-cover cursor-zoom-in"
                  onClick={() => setExpandedImage(selectedPagePreviewImage)}
                />
              </div>
            )}

            <div className="w-full max-w-3xl rounded-2xl border-2 border-neutral-200 bg-orange-50/40 px-4 py-3">
              <p className="font-bold">
                აღწერე გვერდი ტექსტით ან გამოიყენე შენი ფოტო და დააგენერირე
                გვერდები.
              </p>
            </div>

            {/* <div className="w-full max-w-3xl flex gap-2">
              <button
                type="button"
                className={`border-2 rounded-xl px-4 py-2 text-sm min-w-35 flex text-center items-center ${
                  buildMode === "single" ? "bg-[var(--color-primary)]" : ""
                }`}
                onClick={() => {
                  setBuildMode("single");
                  setErrorMessage(null);
                }}
              >
                <span>⚡</span>
                <span> ყველა გვერდი</span>
              </button>
              <button
                type="button"
                className={`border-2 rounded-xl px-4 py-2 text-sm min-w-35 flex text-center items-center ${
                  buildMode === "detailed" ? "bg-[var(--color-primary)]" : ""
                }`}
                onClick={() => {
                  setBuildMode("detailed");
                  setErrorMessage(null);
                }}
              >
                <span>📝</span>
                <span> დეტალური გენერაცია</span>
              </button>
            </div> */}

            {/* {buildMode === "single" && (
              <form
                onSubmit={handleSingleModeSubmit}
                className="w-full max-w-3xl flex flex-col gap-4"
              >
                <label className="flex flex-col gap-2">
                  <span>ერთიანი პრომპტი მთელი წიგნისთვის</span>
                  <textarea
                    className="border-2 rounded-xl px-3 py-2 h-48 resize-none"
                    placeholder="აღწერე სრული ისტორია, პერსონაჟები, გარემო და ძირითადი კონფლიქტი..."
                    value={globalPrompt}
                    onChange={(event) => setGlobalPrompt(event.target.value)}
                    required
                  />
                </label>

                <p className="text-xs md:text-sm text-neutral-700">
                  სიტყვები: {globalWordCount} / მინიმუმ {GLOBAL_MIN_WORDS}
                </p>

                <p className="text-xs md:text-sm text-neutral-600">
                  *რჩევა: აღწერე დასაწყისი, შუა ნაწილი და დასასრული ერთ
                  პრომპტში, რომ ყველა გვერდი ერთიანად განვითარდეს.
                </p>

                {singleModeMessage && (
                  <p className="text-green-700 text-sm">{singleModeMessage}</p>
                )}

                <button
                  type="submit"
                  className="border-2 rounded-2xl py-2 mt-2"
                >
                  ყველა გვერდის მომზადება
                </button>
              </form>
            )} */}

            {/* {buildMode === "detailed" && ( */}
            <form
              onSubmit={handleDetailedModeSubmit}
              className="w-full max-w-3xl flex flex-col gap-4"
            >
              <label className="flex flex-col gap-2">
                <p className="font-bold">1) გვერდის ნომერი</p>
                <select
                  className="border-2 rounded-xl px-3 py-2"
                  value={detailedDraft.pageNumber}
                  onChange={(event) =>
                    setDetailedDraft((prev) => ({
                      ...prev,
                      pageNumber: Number(event.target.value),
                    }))
                  }
                >
                  {Array.from({ length: TOTAL_PAGES }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      გვერდი {index + 1}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-2">
                <p className="font-bold">2) გვერდის სტილი</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`border-2 rounded-xl px-4 py-2 ${
                      useCoverTheme ? "bg-[var(--color-primary)]" : ""
                    }`}
                    onClick={() => setUseCoverTheme(true)}
                  >
                    გამოვიყენებ ყდის სტილს
                  </button>
                  <button
                    type="button"
                    className={`border-2 rounded-xl px-4 py-2 ${
                      !useCoverTheme ? "bg-[var(--color-primary)]" : ""
                    }`}
                    onClick={() => setUseCoverTheme(false)}
                  >
                    ავირჩევ სხვა სტილს
                  </button>
                </div>
              </div>

              {useCoverTheme ? (
                <p className="text-xs md:text-sm text-neutral-700">
                  აქტიური ყდის სტილი:{" "}
                  <b>{coverTheme || "ჯერ არაა ხელმისაწვდომი"}</b>
                </p>
              ) : (
                <label className="flex flex-col gap-2">
                  <select
                    className="border-2 rounded-xl px-3 py-2"
                    value={detailedDraft.theme}
                    onChange={(event) =>
                      setDetailedDraft((prev) => ({
                        ...prev,
                        theme: event.target.value,
                      }))
                    }
                    required={!useCoverTheme}
                  >
                    <option value="" disabled>
                      აირჩიე სტილი
                    </option>
                    {PAGE_THEMES.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="font-bold">3) გვერდის პრომპტი</p>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={`border-2 rounded-xl px-4 py-2 ${
                    detailedDraft.mode === "text"
                      ? "bg-[var(--color-primary)]"
                      : ""
                  }`}
                  onClick={() =>
                    setDetailedDraft((prev) => ({
                      ...prev,
                      mode: "text",
                      imageUploaded: false,
                    }))
                  }
                >
                  ტექსტური პრომპტი
                </button>
                <button
                  type="button"
                  className={`border-2 rounded-xl px-4 py-2 ${
                    detailedDraft.mode === "image"
                      ? "bg-[var(--color-primary)]"
                      : ""
                  }`}
                  onClick={() =>
                    setDetailedDraft((prev) => ({ ...prev, mode: "image" }))
                  }
                >
                  ფოტოს ატვირთვა
                </button>
              </div>

              {detailedDraft.mode === "text" && (
                <>
                  <label className="flex flex-col gap-2">
                    <textarea
                      className="border-2 rounded-xl px-3 py-2 h-45 resize-none"
                      placeholder={
                        "აღწერე კონკრეტულად რა ხდება ამ გვერდზე...\n\n*შეგიძლია პერსონაჟები სახელით მოიხსენიო, \nმაგ: 'ნინი ამბობს: წავედით!'"
                      }
                      value={detailedDraft.prompt}
                      onChange={(event) =>
                        setDetailedDraft((prev) => ({
                          ...prev,
                          prompt: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <p className="text-xs md:text-sm text-neutral-700">
                    სიტყვები: {detailedPromptWordCount} / მინიმუმ{" "}
                    {PAGE_MIN_WORDS}, მაქსიმუმ {PAGE_MAX_WORDS}
                  </p>

                  <div className="rounded-2xl border-2 border-neutral-200 bg-white px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-sm">
                        გვერდზე გამოსაჩენი პერსონაჟები (
                        {selectedCharacterIds.length}/{bookCharacters.length})
                      </p>
                      {bookCharacters.length > 0 && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="border-2 rounded-xl px-3 py-1 text-xs"
                            onClick={() =>
                              setSelectedCharacterIds(
                                bookCharacters.map((character) => character.id),
                              )
                            }
                          >
                            ყველა მონიშვნა
                          </button>
                          <button
                            type="button"
                            className="border-2 rounded-xl px-3 py-1 text-xs"
                            onClick={() => setSelectedCharacterIds([])}
                          >
                            მონიშვნის მოხსნა
                          </button>
                        </div>
                      )}
                    </div>

                    {bookCharacters.length === 0 ? (
                      <p className="text-xs md:text-sm text-neutral-600 mt-2">
                        ჯერ პერსონაჟები არ გაქვს დამატებული. დაამატე პერსონაჟები
                        წინა ნაბიჯში, რომ მათი reference ფოტოები გამოიყენოს
                        გვერდების გენერაციამ.
                      </p>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {bookCharacters.map((character) => {
                          const isSelected = selectedCharacterIds.includes(
                            character.id,
                          );
                          const previewImage =
                            getCharacterPreviewImage(character);

                          return (
                            <button
                              key={character.id}
                              type="button"
                              onClick={() =>
                                handleToggleCharacter(character.id)
                              }
                              className={`text-left border-2 rounded-xl px-3 py-2 transition-colors ${
                                isSelected
                                  ? "border-[var(--color-primary)] bg-orange-50"
                                  : "border-neutral-200 bg-neutral-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {previewImage ? (
                                  <img
                                    src={previewImage}
                                    alt={character.name}
                                    className="h-14 w-14 rounded-lg object-cover border-2"
                                  />
                                ) : (
                                  <div className="h-14 w-14 rounded-lg border-2 bg-neutral-100" />
                                )}
                                <div>
                                  <p className="font-bold text-sm">
                                    {character.name}
                                  </p>
                                  <p className="text-xs text-neutral-600">
                                    {isSelected
                                      ? "მონიშნულია"
                                      : "არ არის მონიშნული"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {detailedDraft.mode === "image" && (
                <>
                  <div>
                    <ImageUpload
                      setUploaded={handleImageUploadedChange}
                      onFilesChange={setImageUploadFiles}
                      previews={imageUploadPreviews}
                      setPreviews={setImageUploadPreviews}
                    />
                    <p className="text-xs md:text-sm text-neutral-600 mt-2">
                      *ატვირთე ფოტო რის მიხედვითაც გინდა გვერდი დაგენერირდეს და
                      ქვემოთ მიუთითე დიალოგის ტექსტი სურვილისამებრ.
                    </p>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span>დიალოგის ტექსტი (არასავალდებულო)</span>
                    <textarea
                      className="border-2 rounded-xl px-3 py-2 h-28 resize-none"
                      placeholder="მაგ: გმირი ამბობს: ჩვენ ამას შევძლებთ!"
                      value={detailedDraft.dialogueHint}
                      onChange={(event) =>
                        setDetailedDraft((prev) => ({
                          ...prev,
                          dialogueHint: event.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              )}

              <button
                type="submit"
                className="border-2 rounded-2xl py-2 mt-2"
                disabled={isGeneratingPage}
              >
                {isGeneratingPage
                  ? "იტვირთება..."
                  : hasExistingVersionSelected
                    ? "გვერდის შეცვლა"
                    : "გვერდის გენერაცია"}
              </button>

              {hasExistingVersionSelected && (
                <div className="rounded-xl border-2 border-neutral-200 bg-white px-3 py-3">
                  <p className="font-bold text-sm">რედაქტირების ინფორმაცია</p>
                  <p className="text-xs md:text-sm text-neutral-700 mt-1">
                    გვერდი {detailedDraft.pageNumber}: გამოყენებულია{" "}
                    {selectedPageRetry.used} / {selectedPageRetry.max}
                  </p>

                  {retryLimitReached && (
                    <div className="mt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleCreateRetryPackOrder}
                        className="border-2 rounded-xl px-3 py-2"
                        disabled={isProcessingRetryPack}
                      >
                        {isProcessingRetryPack
                          ? "იტვირთება..."
                          : "+3 ცდა (1 GEL)"}
                      </button>

                      {pendingRetryPackByPage[detailedDraft.pageNumber] && (
                        <button
                          type="button"
                          onClick={handleApplyRetryPack}
                          className="border-2 rounded-xl px-3 py-2"
                          disabled={isProcessingRetryPack}
                        >
                          Retry ცდების განახლება
                          {pendingRetryOrderByPage[detailedDraft.pageNumber]
                            ? ` (#${pendingRetryOrderByPage[detailedDraft.pageNumber]})`
                            : ""}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </form>
            {/* )} */}

            {errorMessage && (
              <p className="w-full max-w-3xl text-red-500 text-sm">
                {errorMessage}
              </p>
            )}

            {noticeMessage && (
              <p className="w-full max-w-3xl text-green-700 text-sm">
                {noticeMessage}
              </p>
            )}

            <div className="w-full max-w-3xl flex flex-col items-center justify-center">
              <p className="font-bold mb-2">
                მომზადებული გვერდები ({preparedCount}/{TOTAL_PAGES})
              </p>

              {sortedPreparedPages.length === 0 ? (
                <p className="text-xs md:text-sm text-neutral-500">
                  ჯერ არცერთი გვერდი არ არის მომზადებული.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 text-center items-center justify-center">
                  {sortedPreparedPages.map((page) => {
                    const previewImage = getPreparedPagePreviewImage(
                      page.pageNumber,
                    );

                    return (
                      <button
                        type="button"
                        key={page.pageNumber}
                        className="w-30 h-40 mt-4 "
                        onClick={() => selectPageForEditing(page.pageNumber)}
                      >
                        <p className="font-bold text-sm">
                          გვერდი {page.pageNumber}
                        </p>
                        {previewImage && (
                          <img
                            src={previewImage}
                            alt={`გვერდი ${page.pageNumber}`}
                            className="mt-2 h-full w-full rounded-lg border-2 object-cover"
                          />
                        )}
                      </button>
                    );
                  })}

                  {nextEmptyPageNumber && (
                    <button
                      type="button"
                      className="px-3 py-2 bg-white w-30 h-40 mt-16 rounded-lg border-2 border-neutral-200 flex flex-col items-center justify-center"
                      onClick={() => selectPageForEditing(nextEmptyPageNumber)}
                    >
                      <p className="!text-3xl leading-none">+</p>
                      <p className="!text-sm md:!text-base font-bold mt-2">
                        ახალი გვერდის დამათება
                      </p>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="w-full max-w-3xl border-2 rounded-2xl py-3 mt-2 opacity-50 cursor-not-allowed"
              disabled
              aria-disabled="true"
            >
              წიგნის დასრულება
            </button>
          </div>
        </article>
      </section>

      <ImageLightboxModal
        isOpen={Boolean(expandedImage)}
        imageSrc={expandedImage}
        imageAlt="გვერდის მინიატურა"
        onClose={() => setExpandedImage(null)}
      />
    </>
  );
}
