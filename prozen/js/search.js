const COUNT_PUBLICATIONS_API_URL = "https://zen.yandex.ru/media-api/count-publications-by-state?state=published&type=";
const GET_PUBLICATIONS_API_URL = "https://zen.yandex.ru/media-api/get-publications-by-state?state=published&pageSize=";
const TYPES = ["article", "narrative", "post", "gif", "gallery"];

const VISIBLE = ["search_msg", "spinner", "search_result", "search_msg_empty", "search_not_found"];

let token;
let publications = [];
let publisherId;

const dateRange = {start: 0, end: 0}

const picker = new Litepicker({
    element: document.getElementById('start-date'),
    elementEnd: document.getElementById('end-date'),
    singleMode: false,
    dropdowns: {"minYear": 2017, "months": false, "years": true},
    numberOfColumns: 2,
    numberOfMonths: 2,
    format: "DD-MM-YYYY",
    lang: "ru-RU",
    position: "bottom left",
    allowRepick: true,
})
picker.setDateRange ("30-05-2017", Date());


showElement("search_msg");
getChannelId();
initButtons();

function initButtons() {
    document.getElementById('search_button').onclick = searchClick;
    document.getElementById('search-clear').onclick = searchClear;
    document.getElementById("range-clear").onclick = clickSearchAllTime;
    document.getElementById("range-year").onclick = clickThisYear;
    TYPES.forEach(pubType => {
       document.getElementById("show-" + pubType).addEventListener("click", showByType.bind(null, pubType));
    });
}

function clickSearchAllTime() {
    clearDateRange();
    searchClick();
}

function clickThisYear() {
    picker.setDateRange ( new Date (new Date().getFullYear(),0), new Date());
    searchClick();
}

function clearDateRange() {
    if (publications.length > 0) {
        let min = Date.now();
        let max = 0;
        publications.forEach(publication => {
            if (publication.addTime < min) {
                min = publication.addTime;
            }
            if (publication.addTime > max) {
                max = publication.addTime;
            }
        });
        picker.setDateRange(picker.DateTime (new Date(min)), picker.DateTime (new Date(max)));
    } else {
        picker.setDateRange ("30-05-2017", new Date());
    }
}

function getChannelId() {
    chrome.storage.local.get(["prozenSearch", "prozenToken", "prozenPublisherId"], result => {
        publisherId = result.prozenPublisherId;
        token = result.prozenToken;
        const searchString = result.prozenSearch;
        if (searchString.length > 0) {
            document.getElementById("search").value = searchString;
            searchClick();
        }
    });
}

function updateSerchStats() {
    if (publications.length !== 0) {
        const count = {};
        TYPES.forEach(pubType => count[pubType] = 0);
        for (let i = 0; i < publications.length; i++) {
            count [publications[i].type]++;
        }
        document.getElementById('show-article').innerText = "Статьи: " + count.article;
        document.getElementById('show-narrative').innerText = "Нарративы: " + count.article;
        document.getElementById('show-post').innerText = "Посты: " + count.post;
        document.getElementById('show-gif').innerText = "Видео: " + count.gif;
        document.getElementById('show-gallery').innerText = "Галереи: " + count.gallery;
    }
}

function showByType(pubType) {
    clearSearchResults();
    showElement("spinner");
    if (publications.length === 0) {
        loadPublicationsAndShowByType(pubType)
    } else {
        executeShowByType(pubType);
    }
}

function executeShowByType(pubType) {
    const foundCards = [];
    const dateStart = picker.getStartDate();
    const dateEnd = picker.getEndDate();
    for (let i = 0; i < publications.length; i++) {
        const card = publications [i];
        if (card.addTime < dateStart.getTime() || card.addTime > dateEnd.getTime()) {
            continue;
        }
        if (card.type === pubType) {
            foundCards.push(card);
        }
    }
    if (foundCards.length > 0) {
        showElement("search_result");
        for (let i = 0; i < foundCards.length; i++) {
            const card = foundCards[i];
            addSearchResult(card);
        }
    } else {
        showElement("search_not_found");
    }
}

function searchClear() {
    document.getElementById("search").value = "";
}

function searchClick() {
    const searchString = document.getElementById("search").value;
    clearSearchResults();
    showElement("spinner");
    if (publications.length === 0) {
        loadPublicationsAndSearch();
    } else {
        executeSearch();
    }
}

function cardMatch(card, searchString) {
    if (searchString === undefined || searchString.length === 0) {
        return true;
    }
    const ln = searchString.split(" ");
    let foundTitle = true;
    let foundDescription = true;
    const title = card.title.toLocaleLowerCase();
    const description = card.description === undefined ? "" : card.description.toLocaleLowerCase();
    for (let i = 0; i < ln.length; i++) {
        const str = ln[i].toLocaleLowerCase();
        if (!title.includes(str)) {
            foundTitle = false;
        }
        if (!description.includes(str)) {
            foundDescription = false;
        }
    }
    return foundTitle || foundDescription;
}

function executeSearch() {
    const searchStr = document.getElementById("search").value;
    const dateStart = picker.getStartDate();
    const dateEnd = picker.getEndDate();
    const foundCards = [];
    for (let i = 0; i < publications.length; i++) {
        const card = publications [i];
        if (card.addTime < dateStart.getTime() || card.addTime > dateEnd.getTime()) {
            continue;
        }
        if (cardMatch(card, searchStr)) {
            foundCards.push(card);
        }
    }
    if (foundCards.length > 0) {
        showElement("search_result");
        for (let i = 0; i < foundCards.length; i++) {
            const card = foundCards[i];
            addSearchResult(card);
        }
    } else {
        showElement("search_not_found");
    }
}

function loadPublicationsAndShowByType(pubType) {
    loadAllPublications().then(cards => {
        publications = cards;
        updateSerchStats();
        executeShowByType(pubType);
    });
}

function loadPublicationsAndSearch() {
    loadAllPublications().then(cards => {
        publications = cards;
        updateSerchStats();
        executeSearch();
    });
}

function addSearchResult(card) {
    const searchResult = document.getElementById("search_result");
    const div = cardToDiv(card);
    if (card.url !== undefined && card.url !== "") {
        const a = document.createElement("a");
        a.setAttribute("href", card.url);
        a.setAttribute("target", "_blank");
        a.appendChild(div);
        searchResult.appendChild(a);
    } else {
        searchResult.appendChild(div);
    }
    searchResult.appendChild(document.createElement("hr"));
}

function cardToDiv(card) {
    const div = document.createElement("div");
    div.setAttribute("class", "section");
    const icon = document.createElement("span");
    switch (card.type) {
        case "article":
            icon.setAttribute("class", "icon_views span_icon");
            icon.setAttribute("title", "Статья");
            break;
        case "narrative":
            icon.setAttribute("class", "icon_narrative span_icon");
            icon.setAttribute("title", "Нарратив");
            break;
        case "gallery":
            icon.setAttribute("class", "icon_narrative span_icon");
            icon.setAttribute("title", "Галерея");
            break;
        case "gif":
            icon.setAttribute("class", "icon_video span_icon");
            icon.setAttribute("title", "Видео / GIF");
            break;
        case "post":
            icon.setAttribute("class", "icon_post span_icon");
            icon.setAttribute("title", "Пост");
            break;
    }
    div.appendChild(icon);
    const strong = document.createElement("strong");
    strong.innerText = card.title;
    div.appendChild(strong);
    if (card.type === "article" || card.type === "narrative") {
        div.appendChild(document.createElement("br"));
        const span = document.createElement("span");
        span.innerText = card.description === undefined || card.description.length === 0 ? "Описание не указано" : card.description;
        div.appendChild(span);
    } else if (card.type === "gallery") {
        strong.innerText = card.title === undefined || card.title.length === 0 ? "Описание не указано" : card.title;
    } else if (card.type === "post") {
        strong.innerText = card.description === undefined || card.description.length === 0 ? "Описание не указано" : card.description;
    }
    return div;
}

function hideAll() {
    for (let i = 0; i < VISIBLE.length; i++) {
        document.getElementById(VISIBLE[i]).style.display = "none";
    }
}

function showElement(id) {
    hideAll();
    document.getElementById(id).style.display = "block";
}

function clearSearchResults() {
    const element = document.getElementById("search_result");
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

async function loadAllPublications() {
    const publications = [];
    let recordCount = 0;
    for (let i = 0; i < TYPES.length; i++) {
        const publicationType = TYPES[i];
        const response = await loadPublicationsCount(publicationType).then(response => {
            return response;
        });
        const count = response.count;
        const result = await loadPublications(publicationType, count).then(response => {
            const cards = [];
            if (response !== undefined && response.publications !== undefined) {
                for (let i = 0, len = response.publications.length; i < len; i++) {
                    const pubData = {};
                    const publication = response.publications[i];
                    pubData.id = publication.id;
                    pubData.feedShows = publication.privateData.statistics.feedShows;
                    pubData.shows = publication.privateData.statistics.shows;
                    pubData.views = publication.privateData.statistics.views;
                    pubData.viewsTillEnd = publication.privateData.statistics.viewsTillEnd;
                    pubData.comments = publication.privateData.statistics.comments;
                    pubData.likes = publication.privateData.statistics.likes;
                    pubData.sumViewTimeSec = publication.privateData.statistics.sumViewTimeSec;
                    pubData.addTime = publication.addTime !== undefined ? publication.addTime : 0;
                    pubData.type = publication.content.type;
                    pubData.tags = new Set(publication.privateData.tags);
                    pubData.title = publication.content.preview.title;
                    pubData.description = publication.content.preview.snippet;
                    pubData.url = getMediaUrl(publication.id);
                    cards.push(pubData);
                    recordCount++;
                }
            }
            return cards;
        });
        publications.push(...result);
    }
    return publications;
}

function getMediaUrl(publicationId) {
    return "https://zen.yandex.ru/media/id/" + publisherId + "/" + publicationId;
}

function loadPublicationsCount(publicationType) {
    const url = COUNT_PUBLICATIONS_API_URL + encodeURIComponent(publicationType) + "&publisherId=" + publisherId;
    return fetch(url, {credentials: 'same-origin', headers: {'X-Csrf-Token': token}}).then(response => response.json());
}

function loadPublications(publicationType, count) {
    const url = GET_PUBLICATIONS_API_URL + encodeURIComponent(count) + "&type=" + encodeURIComponent(publicationType) + "&publisherId=" + publisherId;
    return fetch(url, {credentials: 'same-origin', headers: {'X-Csrf-Token': token}}).then(response => response.json());
}