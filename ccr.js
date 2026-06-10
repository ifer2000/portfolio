"use strict";

const API_UPLOAD_URL = "http://54.224.62.230:8000/api/v1/upload";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_COUNT = 10;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const selectedFilesBox = document.getElementById("selectedFilesBox");
const selectedCount = document.getElementById("selectedCount");
const previewList = document.getElementById("previewList");
const uploadButton = document.getElementById("uploadButton");
const clearButton = document.getElementById("clearButton");

const statusMessage = document.getElementById("statusMessage");

const emptyResult = document.getElementById("emptyResult");
const loadingResult = document.getElementById("loadingResult");
const errorBox = document.getElementById("errorBox");
const resultContent = document.getElementById("resultContent");

const recognizedIngredientsBox = document.getElementById("recognizedIngredients");
const recipeList = document.getElementById("recipeList");

const sampleButtons = document.querySelectorAll(".sample-use-button");

let selectedFiles = [];
let currentPreviewUrls = [];
let isUploading = false;

init();

function init() {
    dropZone.addEventListener("click", () => {
        if (!isUploading) {
            fileInput.click();
        }
    });

    dropZone.addEventListener("keydown", (event) => {
        if (isUploading) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInput.click();
        }
    });

    fileInput.addEventListener("change", (event) => {
        addFiles(event.target.files);
        fileInput.value = "";
    });

    uploadButton.addEventListener("click", () => {
        uploadSelectedFiles();
    });

    clearButton.addEventListener("click", () => {
        clearSelectedFiles();
    });

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        document.addEventListener(eventName, preventDefaultDragBehavior);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, () => {
            if (!isUploading) {
                dropZone.classList.add("is-dragover");
            }
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove("is-dragover");
        });
    });

    dropZone.addEventListener("drop", (event) => {
        if (isUploading) {
            return;
        }

        addFiles(event.dataTransfer.files);
    });

    sampleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            addSampleFile(button);
        });
    });

    renderSelectedFiles();
}

function preventDefaultDragBehavior(event) {
    event.preventDefault();
    event.stopPropagation();
}

async function addSampleFile(button) {
    if (isUploading) {
        return;
    }

    const sampleUrl = button.dataset.sampleUrl;
    const sampleName = button.dataset.sampleName || "sample.jpg";

    try {
        setStatus("샘플 이미지를 불러오는 중입니다.", "default");

        const response = await fetch(sampleUrl);

        if (!response.ok) {
            throw new Error("샘플 파일을 찾을 수 없습니다.");
        }

        const blob = await response.blob();
        const file = new File([blob], sampleName, {
            type: blob.type || "image/jpeg",
        });

        addFiles([file]);
        setStatus("샘플 이미지가 선택 목록에 추가되었습니다. 분석 버튼을 눌러주세요.", "success");
    } catch (error) {
        console.error(error);
        showError("샘플 이미지를 불러오지 못했습니다. sample 폴더에 이미지 파일이 있는지 확인해주세요.");
        setStatus("샘플 이미지 불러오기 실패", "error");
    }
}

function addFiles(fileList) {
    if (!fileList || fileList.length === 0) {
        setStatus("선택된 파일이 없습니다.", "warning");
        return;
    }

    const incomingFiles = Array.from(fileList);
    const validFiles = [];
    const rejectedMessages = [];

    incomingFiles.forEach((file) => {
        const validationMessage = validateImageFile(file);

        if (validationMessage) {
            rejectedMessages.push(`${file.name}: ${validationMessage}`);
            return;
        }

        if (isDuplicateFile(file)) {
            rejectedMessages.push(`${file.name}: 이미 선택된 파일입니다.`);
            return;
        }

        if (selectedFiles.length + validFiles.length >= MAX_FILE_COUNT) {
            rejectedMessages.push(`최대 ${MAX_FILE_COUNT}장까지만 선택할 수 있습니다.`);
            return;
        }

        validFiles.push(file);
    });

    if (validFiles.length > 0) {
        selectedFiles = selectedFiles.concat(validFiles);
        clearError();
        renderSelectedFiles();

        setStatus(
            `${validFiles.length}장의 사진이 추가되었습니다. 분석 버튼을 눌러주세요.`,
            "success"
        );
    }

    if (validFiles.length === 0 && rejectedMessages.length > 0) {
        showError(rejectedMessages[0]);
        setStatus("파일 추가 실패", "error");
        return;
    }

    if (validFiles.length > 0 && rejectedMessages.length > 0) {
        setStatus(
            `일부 파일은 추가되지 않았습니다. ${rejectedMessages[0]}`,
            "warning"
        );
    }
}

function validateImageFile(file) {
    if (!file.type.startsWith("image/")) {
        return "이미지 파일만 업로드할 수 있습니다.";
    }

    const fileSizeMB = file.size / 1024 / 1024;

    if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return `이미지 용량은 ${MAX_FILE_SIZE_MB}MB 이하만 업로드할 수 있습니다.`;
    }

    return "";
}

function isDuplicateFile(file) {
    const fileKey = getFileKey(file);

    return selectedFiles.some((selectedFile) => {
        return getFileKey(selectedFile) === fileKey;
    });
}

function getFileKey(file) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

function renderSelectedFiles() {
    clearPreviewUrls();

    uploadButton.disabled = selectedFiles.length === 0 || isUploading;
    clearButton.disabled = selectedFiles.length === 0 || isUploading;

    selectedCount.textContent = `선택된 사진 ${selectedFiles.length}장`;

    if (selectedFiles.length === 0) {
        selectedFilesBox.classList.add("is-hidden");
        previewList.innerHTML = "";
        return;
    }

    selectedFilesBox.classList.remove("is-hidden");

    previewList.innerHTML = selectedFiles
        .map((file, index) => {
            const previewUrl = URL.createObjectURL(file);
            currentPreviewUrls.push(previewUrl);

            return `
                <div class="preview-item">
                    <img src="${previewUrl}" alt="${escapeHTML(file.name)} 미리보기" />

                    <div class="preview-info">
                        <strong title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</strong>
                        <span>${formatFileSize(file.size)}</span>
                    </div>

                    <button
                        type="button"
                        class="remove-file-button"
                        data-remove-index="${index}"
                        aria-label="${escapeHTML(file.name)} 삭제"
                    >
                        ×
                    </button>
                </div>
            `;
        })
        .join("");

    const removeButtons = previewList.querySelectorAll(".remove-file-button");

    removeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (isUploading) {
                return;
            }

            const removeIndex = Number(button.dataset.removeIndex);
            removeSelectedFile(removeIndex);
        });
    });
}

function removeSelectedFile(index) {
    selectedFiles = selectedFiles.filter((_, fileIndex) => {
        return fileIndex !== index;
    });

    renderSelectedFiles();

    if (selectedFiles.length === 0) {
        setStatus("사진을 선택한 뒤 분석 버튼을 눌러주세요.", "default");
    } else {
        setStatus("선택한 사진이 삭제되었습니다.", "success");
    }
}

function clearSelectedFiles() {
    if (isUploading) {
        return;
    }

    selectedFiles = [];
    renderSelectedFiles();
    setStatus("선택 목록이 초기화되었습니다.", "default");
}

function clearPreviewUrls() {
    currentPreviewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
    });

    currentPreviewUrls = [];
}

async function uploadSelectedFiles() {
    if (selectedFiles.length === 0) {
        showError("분석할 사진을 먼저 선택해주세요.");
        setStatus("분석할 사진이 없습니다.", "error");
        return;
    }

    if (API_UPLOAD_URL.includes("내서버")) {
        showError("ccr.js 파일 맨 위의 API_UPLOAD_URL을 실제 CCR 서버 주소로 바꿔주세요.");
        setStatus("서버 주소 설정 필요", "error");
        return;
    }

    setLoadingState(true);
    clearError();

    const mergedData = {
        recognizedIngredients: [],
        recipes: [],
    };

    const failedFiles = [];
    let successCount = 0;

    try {
        for (let index = 0; index < selectedFiles.length; index += 1) {
            const file = selectedFiles[index];

            setStatus(
                `${index + 1}/${selectedFiles.length}번째 사진 분석 중: ${file.name}`,
                "default"
            );

            try {
                const data = await uploadSingleFile(file);
                mergeApiResult(mergedData, data);
                successCount += 1;
            } catch (error) {
                console.error(error);
                failedFiles.push(file.name);
            }
        }

        if (successCount === 0) {
            showError(
                "모든 이미지 분석에 실패했습니다. 서버 실행 상태, API 주소, CORS, EC2 보안그룹을 확인해주세요."
            );
            setStatus("분석 실패", "error");
            return;
        }

        finalizeMergedData(mergedData);
        renderResult(mergedData);

        if (failedFiles.length > 0) {
            setStatus(
                `분석 완료. 단, ${failedFiles.length}개 파일은 실패했습니다.`,
                "warning"
            );
        } else {
            setStatus("모든 사진 분석이 완료되었습니다.", "success");
        }
    } finally {
        setLoadingState(false);
    }
}

async function uploadSingleFile(file) {
    const formData = new FormData();

    /*
        FastAPI 서버의 UploadFile 파라미터 이름이 file 이라고 가정한다.
        /docs에서 확인한 파라미터 이름이 다르면 여기의 "file"을 바꿔야 한다.
    */
    formData.append("file", file);

    const response = await fetch(API_UPLOAD_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `서버 응답 오류: ${response.status}. ${errorText.slice(0, 120)}`
        );
    }

    return response.json();
}

function setLoadingState(loading) {
    isUploading = loading;

    dropZone.classList.toggle("is-loading", loading);

    uploadButton.disabled = loading || selectedFiles.length === 0;
    clearButton.disabled = loading || selectedFiles.length === 0;

    if (loading) {
        emptyResult.classList.add("is-hidden");
        errorBox.classList.add("is-hidden");
        resultContent.classList.add("is-hidden");
        loadingResult.classList.remove("is-hidden");
        uploadButton.textContent = "분석 중입니다...";
        return;
    }

    loadingResult.classList.add("is-hidden");
    uploadButton.textContent = "선택한 사진 분석하기";
}

function mergeApiResult(target, source) {
    const recognizedIngredients = Array.isArray(source.recognizedIngredients)
        ? source.recognizedIngredients
        : [];

    const recipes = Array.isArray(source.recipes)
        ? source.recipes
        : [];

    recognizedIngredients.forEach((ingredientName) => {
        addUniqueIngredient(target.recognizedIngredients, ingredientName);
    });

    recipes.forEach((recipe) => {
        const recipeKey = getRecipeKey(recipe);

        const existingRecipe = target.recipes.find((targetRecipe) => {
            return getRecipeKey(targetRecipe) === recipeKey;
        });

        if (!existingRecipe) {
            target.recipes.push(copyRecipe(recipe));
            return;
        }

        mergeRecipe(existingRecipe, recipe);
    });
}

function addUniqueIngredient(list, ingredientName) {
    const name = String(ingredientName || "").trim();

    if (!name) {
        return;
    }

    const normalizedName = normalizeName(name);

    const alreadyExists = list.some((existingName) => {
        return normalizeName(existingName) === normalizedName;
    });

    if (!alreadyExists) {
        list.push(name);
    }
}

function getRecipeKey(recipe) {
    if (recipe.recipeId !== undefined && recipe.recipeId !== null) {
        return `id:${recipe.recipeId}`;
    }

    return `title:${normalizeName(recipe.title || "unknown")}`;
}

function copyRecipe(recipe) {
    return {
        recipeId: recipe.recipeId,
        title: recipe.title || "이름 없는 레시피",
        thumbnailUrl: recipe.thumbnailUrl || "",
        difficulty: recipe.difficulty || "미정",
        estimatedTime: recipe.estimatedTime || "미정",
        ingredients: Array.isArray(recipe.ingredients)
            ? recipe.ingredients.map((ingredient) => ({
                name: ingredient.name || "이름 없는 재료",
                owned: Boolean(ingredient.owned),
            }))
            : [],
        steps: Array.isArray(recipe.steps)
            ? recipe.steps.map((step) => ({
                stepNumber: step.stepNumber,
                description: step.description || "설명 없음",
            }))
            : [],
    };
}

function mergeRecipe(existingRecipe, incomingRecipe) {
    existingRecipe.ingredients = mergeIngredients(
        existingRecipe.ingredients,
        incomingRecipe.ingredients
    );

    if (
        (!Array.isArray(existingRecipe.steps) || existingRecipe.steps.length === 0) &&
        Array.isArray(incomingRecipe.steps)
    ) {
        existingRecipe.steps = incomingRecipe.steps.map((step) => ({
            stepNumber: step.stepNumber,
            description: step.description || "설명 없음",
        }));
    }

    if (!existingRecipe.difficulty && incomingRecipe.difficulty) {
        existingRecipe.difficulty = incomingRecipe.difficulty;
    }

    if (!existingRecipe.estimatedTime && incomingRecipe.estimatedTime) {
        existingRecipe.estimatedTime = incomingRecipe.estimatedTime;
    }
}

function mergeIngredients(existingIngredients, incomingIngredients) {
    const mergedIngredients = [];

    const pushOrMergeIngredient = (ingredient) => {
        if (!ingredient || !ingredient.name) {
            return;
        }

        const name = ingredient.name;
        const normalizedName = normalizeName(name);

        const existingIngredient = mergedIngredients.find((item) => {
            return normalizeName(item.name) === normalizedName;
        });

        if (!existingIngredient) {
            mergedIngredients.push({
                name,
                owned: Boolean(ingredient.owned),
            });
            return;
        }

        existingIngredient.owned = existingIngredient.owned || Boolean(ingredient.owned);
    };

    if (Array.isArray(existingIngredients)) {
        existingIngredients.forEach(pushOrMergeIngredient);
    }

    if (Array.isArray(incomingIngredients)) {
        incomingIngredients.forEach(pushOrMergeIngredient);
    }

    return mergedIngredients;
}

function finalizeMergedData(data) {
    const recognizedIngredients = Array.isArray(data.recognizedIngredients)
        ? data.recognizedIngredients
        : [];

    data.recipes = data.recipes.map((recipe) => {
        const ingredients = Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : [];

        return {
            ...recipe,
            ingredients: ingredients.map((ingredient) => ({
                ...ingredient,
                owned:
                    Boolean(ingredient.owned) ||
                    isIngredientOwnedByRecognizedNames(ingredient.name, recognizedIngredients),
            })),
        };
    });

    data.recipes.sort(compareRecipes);
}

function compareRecipes(recipeA, recipeB) {
    const statsA = getRecipeIngredientStats(recipeA);
    const statsB = getRecipeIngredientStats(recipeB);

    if (statsB.ownedCount !== statsA.ownedCount) {
        return statsB.ownedCount - statsA.ownedCount;
    }

    if (statsA.missingCount !== statsB.missingCount) {
        return statsA.missingCount - statsB.missingCount;
    }

    return String(recipeA.title || "").localeCompare(String(recipeB.title || ""), "ko");
}

function getRecipeIngredientStats(recipe) {
    const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const ownedCount = ingredients.filter((ingredient) => {
        return Boolean(ingredient.owned);
    }).length;

    return {
        totalCount: ingredients.length,
        ownedCount,
        missingCount: ingredients.length - ownedCount,
    };
}

function isIngredientOwnedByRecognizedNames(ingredientName, recognizedIngredients) {
    const normalizedIngredientName = normalizeName(ingredientName);

    return recognizedIngredients.some((recognizedName) => {
        const normalizedRecognizedName = normalizeName(recognizedName);

        if (!normalizedRecognizedName || !normalizedIngredientName) {
            return false;
        }

        if (normalizedIngredientName === normalizedRecognizedName) {
            return true;
        }

        /*
            예:
            인식 결과가 "소고기"이고 필요 재료가 "소고기 불고기용"인 경우를 어느 정도 보정한다.
            단, 한 글자 재료명은 오탐 가능성이 있어 포함 비교에서 제외한다.
        */
        if (
            normalizedRecognizedName.length >= 2 &&
            normalizedIngredientName.includes(normalizedRecognizedName)
        ) {
            return true;
        }

        if (
            normalizedIngredientName.length >= 2 &&
            normalizedRecognizedName.includes(normalizedIngredientName)
        ) {
            return true;
        }

        return false;
    });
}

function renderResult(data) {
    const recognizedIngredients = Array.isArray(data.recognizedIngredients)
        ? data.recognizedIngredients
        : [];

    const recipes = Array.isArray(data.recipes)
        ? data.recipes
        : [];

    emptyResult.classList.add("is-hidden");
    loadingResult.classList.add("is-hidden");
    errorBox.classList.add("is-hidden");
    resultContent.classList.remove("is-hidden");

    renderRecognizedIngredients(recognizedIngredients);
    renderRecipes(recipes);

    resultContent.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
    });
}

function renderRecognizedIngredients(ingredients) {
    if (ingredients.length === 0) {
        recognizedIngredientsBox.innerHTML = `
            <span class="chip empty-chip">인식된 식재료가 없습니다</span>
        `;
        return;
    }

    recognizedIngredientsBox.innerHTML = ingredients
        .map((ingredient) => {
            return `
                <span class="chip">
                    ${escapeHTML(ingredient)}
                </span>
            `;
        })
        .join("");
}

function renderRecipes(recipes) {
    if (recipes.length === 0) {
        recipeList.innerHTML = `
            <div class="recipe-card">
                <h4 class="recipe-title">추천 가능한 레시피가 없습니다</h4>
                <p class="recipe-meta">
                    인식된 식재료와 일치하는 레시피를 찾지 못했습니다.
                </p>
            </div>
        `;
        return;
    }

    recipeList.innerHTML = recipes
        .map((recipe, index) => createRecipeCardHTML(recipe, index))
        .join("");

    const toggleButtons = recipeList.querySelectorAll(".recipe-toggle");

    toggleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.dataset.target;
            const detailElement = document.getElementById(targetId);

            if (!detailElement) {
                return;
            }

            const isOpen = detailElement.classList.toggle("is-open");

            button.textContent = isOpen ? "조리 순서 접기" : "조리 순서 보기";
            button.setAttribute("aria-expanded", String(isOpen));
        });
    });
}

function createRecipeCardHTML(recipe, index) {
    const recipeId = recipe.recipeId ?? index;
    const safeDetailId = `recipe-detail-${String(recipeId).replace(/[^a-zA-Z0-9_-]/g, "")}-${index}`;

    const title = recipe.title || "이름 없는 레시피";
    const difficulty = recipe.difficulty || "미정";
    const estimatedTime = recipe.estimatedTime || "미정";

    const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const steps = Array.isArray(recipe.steps)
        ? recipe.steps
        : [];

    const stats = getRecipeIngredientStats(recipe);

    const ingredientsHTML = ingredients.length > 0
        ? ingredients
            .map((ingredient) => {
                const ingredientName = ingredient.name || "이름 없는 재료";
                const owned = Boolean(ingredient.owned);

                return `
                    <span class="ingredient-pill ${owned ? "owned" : "missing"}">
                        <span>${owned ? "보유" : "부족"}</span>
                        ${escapeHTML(ingredientName)}
                    </span>
                `;
            })
            .join("")
        : `<span class="ingredient-pill missing">재료 정보 없음</span>`;

    const stepsHTML = steps.length > 0
        ? steps
            .slice()
            .sort((a, b) => {
                const stepA = Number(a.stepNumber) || 0;
                const stepB = Number(b.stepNumber) || 0;
                return stepA - stepB;
            })
            .map((step) => {
                return `
                    <li>${escapeHTML(step.description || "설명 없음")}</li>
                `;
            })
            .join("")
        : `<li>조리 순서 정보가 없습니다.</li>`;

    return `
        <article class="recipe-card">
            <h4 class="recipe-title">${escapeHTML(title)}</h4>

            <div class="recipe-meta">
                <span class="meta-badge">난이도 ${escapeHTML(difficulty)}</span>
                <span class="meta-badge">예상 시간 ${escapeHTML(estimatedTime)}</span>
                <span class="meta-badge">보유 재료 ${stats.ownedCount}개</span>
            </div>

            <p class="ingredients-title">필요 재료</p>

            <div class="ingredient-list">
                ${ingredientsHTML}
            </div>

            <button
                type="button"
                class="recipe-toggle"
                data-target="${safeDetailId}"
                aria-expanded="false"
            >
                조리 순서 보기
            </button>

            <div id="${safeDetailId}" class="recipe-detail">
                <ol class="step-list">
                    ${stepsHTML}
                </ol>
            </div>
        </article>
    `;
}

function showError(message) {
    emptyResult.classList.add("is-hidden");
    loadingResult.classList.add("is-hidden");
    resultContent.classList.add("is-hidden");

    errorBox.textContent = message;
    errorBox.classList.remove("is-hidden");
}

function clearError() {
    errorBox.textContent = "";
    errorBox.classList.add("is-hidden");
}

function setStatus(message, type) {
    statusMessage.textContent = message;

    statusMessage.classList.remove("success", "error", "warning");

    if (type === "success") {
        statusMessage.classList.add("success");
    }

    if (type === "error") {
        statusMessage.classList.add("error");
    }

    if (type === "warning") {
        statusMessage.classList.add("warning");
    }
}

function formatFileSize(size) {
    const sizeKB = size / 1024;

    if (sizeKB < 1024) {
        return `${sizeKB.toFixed(1)}KB`;
    }

    return `${(sizeKB / 1024).toFixed(1)}MB`;
}

function normalizeName(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, "")
        .toLowerCase();
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
