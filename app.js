"use strict";

// Global variables
const YEAR = 2018;
const DOMAIN = `${window.location.origin}/`;
const CANVAS_SIZES = [4, 9, 16, 25];
const DEFAULT_SIZE = 9;
const ACTIVE_CLASS = "active";
const HASH = window.location.hash.substr(1).split("=");
const API_CLIENT_ID = "96553afb3bb9430d91c2d2ee9d8c5c75";
const API_BASE = "https://api.instagram.com/";
const LOGIN_URL = `${API_BASE}oauth/authorize/?client_id=${API_CLIENT_ID}&redirect_uri=${DOMAIN}&response_type=token`;
const API_ENDPOINT = `${API_BASE}v1/users/self/media/recent/?access_token=${HASH[1]}`;

// Set the initial view and render the app
window.onload = () => {
  if (HASH[0] === "access_token") {
    history.replaceState("", document.title, DOMAIN);
    return renderView("loading", callbackPics);
  }

  return renderView("home", callbackHome);
};

// The rest of the app
const renderView = (view, callback) => {
  showView('view', view);

  if (callback) {
    callback();
  }
};

const callbackHome = () => {
  const loginBtn = document.getElementById("js-login");
  loginBtn.setAttribute("href", LOGIN_URL);
  loginBtn.addEventListener("click", () => renderView("loading"));
}

const callbackPics = () => {
  document.getElementById("js-message").innerHTML = "Hold tight, this could take a minute...";
  fetchMedia(API_ENDPOINT, YEAR, [])
    .then(response => {
      const canvasArr = CANVAS_SIZES.map(size => `js-canvas--${size}`);
      const tabArr = CANVAS_SIZES.map(size => `js-tab--${size}`);
      const linkArr = ([1,2,3]).map(size => `js-download--${size}`);

      createCollage(response, CANVAS_SIZES).then(response => {
        addDataURLs(canvasArr);
        updateCollageSrc(document.getElementById(`js-canvas--${DEFAULT_SIZE}`).dataset.url);
        document.getElementById(`js-tab--${DEFAULT_SIZE}`).classList.add(ACTIVE_CLASS);
        enableTabs(tabArr, ACTIVE_CLASS, canvasArr);
        updateDownloadLinks(linkArr, `js-canvas--${DEFAULT_SIZE}`, DEFAULT_SIZE);
        renderView("pics");
      });

    })
    .catch(displayError);
};

const callbackError = error => {
  document.getElementById("js-error").innerHTML = error;
};

const fetchMedia = (endpoint, year, media) => {
  return new Promise((resolve, reject) => {
    getPostsFromYear(endpoint, year, media).then(response => {
      return resolve(response);
    });
  });
};

const getPostsFromYear = (endpoint, year, media) => {
  return fetch(endpoint)
    .then(response => {
      return response.json();
    })
    .then(response => {
      const data = response.data;
      const lastMediaYear = getMediaYear(data[data.length - 1].created_time);
      const moreResults = response.pagination.next_url && lastMediaYear > year - 1;
      const newMedia = data.filter(media => getMediaYear(media.created_time) === year);

      const updatedMedia = media
        .concat(newMedia)
        .sort((a, b) => b.likes.count - a.likes.count || b.comments.count - a.comments.count)
        .splice(0, 25);

      if (moreResults) {
        return getPostsFromYear(response.pagination.next_url, year, updatedMedia);
      }

      return updatedMedia;
    })
    .catch(displayError);
};

const addDataURLs = canvasArr => {
  canvasArr.forEach(canvasId => {
    const canvas = document.getElementById(canvasId);
    canvas.dataset["url"] = canvas.toDataURL("image/jpeg", 0.8);
  });
}

const updateCollageSrc = src => {
  document.getElementById('js-collage').src = src;
}

const updateTabs = (tabArr, activeId, activeClass) => {
  tabArr.forEach(tabId => document.getElementById(tabId).classList.remove(activeClass));
  document.getElementById(activeId).classList.add(activeClass);
}

const enableTabs = (tabArr, activeClass, canvasArr) => {
  tabArr.forEach(tabId => {
    const tab = document.getElementById(tabId);
    tab.addEventListener("click", event => {
      updateTabs(tabArr, event.currentTarget.id, activeClass);
      updateCollageSrc(document.getElementById(`js-canvas--${tab.dataset.pics}`).dataset.url);
      updateDownloadLinks(["js-download--1", "js-download--2", "js-download--3"], `js-canvas--${tab.dataset.pics}`, tab.dataset.pics)
    })
  })
}

const addMedia = (ctx, url, posX, posY, w) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const crop = Math.min(image.width, image.height);
      ctx.drawImage(image, image.width / 2 - crop / 2, image.height / 2 - crop / 2, crop, crop, posX, posY, w, w);
      return resolve(image);
    };
    image.src = url;
  })
};

const getMediaYear = date => new Date(date * 1000).getFullYear();

const createCollage = (media, canvasSizes) => {
  const imagePromises = [];

  canvasSizes.forEach(canvasSize => {
    let canvas = document.getElementById(`js-canvas--${canvasSize}`);
    const context = canvas.getContext("2d");
    const gridNum = Math.sqrt(canvasSize);
    const gutterWidth = 2;
    const numLikes = media.slice(0, canvasSize).reduce((total, item) => (total += item.likes.count), 0);
    const imageWidth = Math.floor(750 / gridNum);
    const canvasWidth = (imageWidth * gridNum) + ((gridNum - 1) * gutterWidth);

    canvas.width = canvasWidth;
    canvas.height = canvas.width;
    context.fillStyle = "#ffffff";
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < canvasSize; i++) {
      const item = media[i];
      const col = i % gridNum;
      const row = Math.floor(i / gridNum);
      const posX =(imageWidth * col) + (gutterWidth * col);
      const posY = (imageWidth * row) + (gutterWidth * row);
      imagePromises.push(addMedia(context, item.images.standard_resolution.url, posX, posY, imageWidth));
    }
  });

  return new Promise((resolve, reject) => {
    Promise.all(imagePromises).then(responses => {
      resolve(true)
    })
  })
};

const updateDownloadLinks = (selectorsArr, canvasId, num) => {
  selectorsArr.forEach(id => {
    const link = document.getElementById(id);
    link.href = document.getElementById(canvasId).dataset.url;
    link.download = `MyTop${num}of${YEAR}.jpg`;
  });
}

const showView = (viewClass, activeId) => {
  Array.from(document.querySelectorAll(`.${viewClass}`)).forEach(view => hideElement(view));
  showElement(document.getElementById(activeId));
}

const hideElement = view => {
  view.setAttribute("hidden", "hidden");
  view.style.display = "none";
}

const showElement = view => {
  view.removeAttribute("hidden");
  view.style.display = "inherit";
}

const displayError = error => {
  renderView("error", callbackError(error));
  console.log(error);
};
