start();

function start() {
    //https://zen.yandex.ru/video/watch/619765a4c79525319b85665e
    getOption(OPTIONS.prozen).then(enabled => {
        if (enabled) {
            // window.removeEventListener("message", ReceiveProzenData);
            if (!document.getElementById("prozen-css")) {
                const css = document.createElement("link");
                css.setAttribute("rel", "stylesheet");
                css.setAttribute("type", "text/css");
                css.id = "prozen-css";
                css.setAttribute("href", chrome.extension.getURL("css/prozen.css"));
                document.head.appendChild(css);
            }
            showStatsVideo();
            /*
            if (!document.getElementById("prozen-page-script")) {
                const script = document.createElement("script");
                script.setAttribute("type", "text/javascript");
                script.id = "prozen-page-script";
                script.setAttribute("src", chrome.extension.getURL("js/page.js"));
                document.body.appendChild(script);
            }
            window.addEventListener("message", ReceiveProzenData);
            */
        }
    });
}


async function showStatsVideo() {
    /*const channelLink = document.querySelector("a.card-channel-info__link");
    const channelUrl = new URL (channelLink.href); */

    const videoId = getPostIdFromUrl(window.location.pathname);
    const videoData = await loadPublicationStat(videoId);

    const sumViewTimeSec = videoData.sumViewTimeSec;
    const views = videoData.views;
    const viewsTillEnd = videoData.viewsTillEnd;

    const statsDiv = document.querySelector("div.video-viewer-description__info");
    statsDiv.innerText = "";
    const spanViews = createElement("span");
    spanViews.innerText = `📺 ${views.toLocaleString("ru-RU", {maximumFractionDigits: 0})}`;
    spanViews.setAttribute("title", "Просмотры");
    statsDiv.appendChild(spanViews);

    const spanTime = createElement("span");
    spanTime.innerText = ` • ⌚ ${secToText(infiniteAndNan(sumViewTimeSec / viewsTillEnd))}`;
    spanTime.setAttribute("title", "Среднее время просмотра");
    statsDiv.appendChild(spanTime);

    if (checkNone()) {
        const spanSadRobot = createElement("span");
        spanSadRobot.innerText = " • 🤖";
        spanSadRobot.setAttribute("title", "Обнаружен мета-тег <meta property=\"robots\" content=\"none\" />\n" +
            "Публикация не индексируется поисковиками.\n" +
            "Примечание: связь этого тега с показами,\n" +
            "пессимизацией и иными ограничениями канала\n" +
            "официально не подтверждена.");
        statsDiv.appendChild(spanSadRobot);
    }
}
