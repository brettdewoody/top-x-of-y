"use strict";

// Global variables
const YEAR = 2017;
const DOMAIN = `${window.location.origin}/`;
const CANVAS_SIZES = [4, 9, 16, 25];
const DEFAULT_TAB = 9;
const HASH = window.location.hash.substr(1).split("=");
const API_CLIENT_ID = "96553afb3bb9430d91c2d2ee9d8c5c75";
const API_BASE = "https://api.instagram.com/";
const LOGIN_URL = `${API_BASE}oauth/authorize/?client_id=${API_CLIENT_ID}&redirect_uri=${DOMAIN}&response_type=token`;
const API_ENDPOINT = `${API_BASE}v1/users/self/media/recent/?access_token=${HASH[1]}`;

// Set the initial view and render the app
window.onload = () => {
  if (HASH[0] === "access_token") {
    history.replaceState("", document.title, DOMAIN);
    return renderView("loading", renderPics);
  }

  return renderView("home", renderHome);
};

// The rest of the app
const renderView = (view, callback) => {
  const viewEl = document.getElementById(view);
  Array.from(document.querySelectorAll(".view")).forEach(view => {
    view.setAttribute("hidden", true);
    view.setAttribute("aria-hidden", true);
    view.classList.remove("active");
  });
  viewEl.classList.add("active");
  viewEl.removeAttribute("hidden");
  viewEl.removeAttribute("aria-hidden");

  if (callback) {
    callback();
  }
};

const renderHome = () => {
  const loginBtn = document.getElementById("js-login");
  loginBtn.setAttribute("href", LOGIN_URL);
  loginBtn.addEventListener("click", () => renderView("loading"));
}

const renderPics = () => {
  document.getElementById("js-message").innerHTML = "Hold tight, this could take a minute...";
  fetchMedia(API_ENDPOINT, [])
    .then(response => {
      createCollage(response).then(response => {
        floatCanvas(DEFAULT_TAB);
        CANVAS_SIZES.forEach(canvasSize => {
          const canvas = document.getElementById(`js-canvas--${canvasSize}`);
          canvas.dataset["url"] = canvas.toDataURL();
        });
        (["js-download--1", "js-download--2", "js-download--3"]).forEach(id => enableDownloadLink(id, `js-canvas--${DEFAULT_TAB}`));
        renderView("pics");
      });

      document.getElementById(`tab-${DEFAULT_TAB}`).classList.add("active");
      const tabs = Array.from(document.querySelectorAll(".js-select-pics"));
      tabs.forEach(tab => {
        tab.addEventListener("click", event => {
          const numPics = tab.dataset.pics;
          document.querySelector(".canvas__tab.active").classList.remove("active");
          tab.classList.add("active");
          floatCanvas(numPics);
          (["js-download--1", "js-download--2", "js-download--3"]).forEach(id => enableDownloadLink(id, `js-canvas--${numPics}`));
        })
      })
    })
    .catch(displayError);
};

const renderError = error => {
  document.getElementById("js-error").innerHTML = error;
};

const fetchMedia = (endpoint, media) => {
  return new Promise((resolve, reject) => {
    getRecent(endpoint, media).then(response => {
      return resolve(response);
    });
  });
};

const getRecent = (endpoint, media) => {
  return fetch(endpoint)
    .then(response => {
      return response.json();
    })
    .then(response => {
      const data = response.data;
      const lastMediaYear = getMediaYear(data[data.length - 1].created_time);
      const moreResults = response.pagination.next_url && lastMediaYear > YEAR - 1;
      const newMedia = data.filter(media => getMediaYear(media.created_time) === YEAR);

      const updatedMedia = media
        .concat(newMedia)
        .sort((a, b) => b.likes.count - a.likes.count || b.comments.count - a.comments.count)
        .splice(0, 25);

      if (moreResults) {
        return getRecent(response.pagination.next_url, updatedMedia);
      }

      return updatedMedia;
    })
    .catch(displayError);
};

const floatCanvas = id => {
  const canvases = Array.from(document.querySelectorAll(".canvas"));
  canvases.forEach(canvas => {
    if (canvas.getAttribute("id") === `js-canvas--${id}`) {
      canvas.style.zIndex = 10;
    } else {
      canvas.style.zIndex = 0;
    }
  });

  document.getElementById(`js-canvas--${id}`).style.zIndex = 10;
}

const addMedia = (ctx, url, posX, posY, w) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const crop = Math.min(image.width, image.height);
      ctx.drawImage(image, 0, 0, crop, crop, posX, posY, w, w);
      return resolve(image);
    };
    image.src = url;
  })
};

const getMediaYear = date => new Date(date * 1000).getFullYear();

const addText = (ctx, text, pos_x, pos_y) => {
  ctx.textAlign = "left";
  ctx.font = "36px -apple-system, system-ui, Arial";
  ctx.fillStyle = "#222222";
  ctx.fillText(text, pos_x, pos_y);
};

const createCollage = media => {
  const imagePromises = [];

  CANVAS_SIZES.forEach(canvasSize => {
    const canvas = document.getElementById(`js-canvas--${canvasSize}`);
    const context = canvas.getContext("2d");
    const numLikes = media.slice(0, canvasSize).reduce((total, item) => (total += item.likes.count), 0);

    canvas.width = 868;
    canvas.height = canvas.width;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const gridNum = Math.sqrt(canvasSize);
    const gutterWidth = 6;
    const offset = 30;
    const imageWidth = ((canvas.width - (offset * 2)) - (gutterWidth * (gridNum - 1)) ) / gridNum;

    for (let i = 0; i < canvasSize; i++) {
      const item = media[i];
      const col = i % gridNum;
      const row = Math.floor(i / gridNum);
      const posX = offset + (imageWidth * col) + (gutterWidth * col);
      const posY = (imageWidth * row) + (gutterWidth * row);
      imagePromises.push(addMedia(context, item.images.standard_resolution.url, posX, posY, imageWidth));
    }

    addText(context, `My 2017 Top ${canvasSize} Posts - ${numLikes.toLocaleString()} Likes`, 30, canvas.height - 20);
  });

  return new Promise((resolve, reject) => {
    Promise.all(imagePromises).then(responses => {
      resolve(true)
    })
  })
};

const enableDownloadLink = (id, canvasId) => {
  const link = document.getElementById(id);
  link.href = document.getElementById(canvasId).dataset.url;
  link.download = "My2017Top4.jpg";
}

const displayError = error => {
  renderView("error", renderError(error));
  console.log(error);
};