"use strict";

// Global variables
const YEAR = 2017;
const DOMAIN = `${window.location.origin}/`;
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

const renderHome = () => document.getElementById("js-login").setAttribute("href", LOGIN_URL);

const renderPics = () => {
  fetchMedia(API_ENDPOINT, [])
    .then(response => {
      renderView("pics");
      createCollage(response);
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
        .splice(0, 4);

      if (moreResults) {
        return getRecent(response.pagination.next_url, updatedMedia);
      }

      return updatedMedia;
    })
    .catch(displayError);
};

const addMedia = (ctx, url, pos, w) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    const crop = Math.min(image.width, image.height);
    ctx.drawImage(image, 0, 0, crop, crop, pos[0], pos[1], w, w);
  };
  image.src = url;
};

const getMediaYear = date => new Date(date * 1000).getFullYear();

const addText = (ctx, text, pos) => {
  ctx.textAlign = "center";
  ctx.font = "36px -apple-system, system-ui, Arial";
  ctx.fillStyle = "#222222";
  ctx.fillText(text, pos[0], pos[1]);
};

const createCollage = media => {
  const canvas = document.getElementById("js-canvas");
  const context = canvas.getContext("2d");
  const positions = [[30, 0], [438, 0], [30, 408], [438, 408]];
  const numLikes = media.reduce((total, item) => (total += item.likes.count), 0);

  canvas.width = 868;
  canvas.height = canvas.width;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  media.forEach((item, i) => {
    addMedia(context, item.images.standard_resolution.url, positions[i], 400);
  });

  addText(context, `My 2017 Top 4 Photos - ${numLikes} Likes`, [
    canvas.width / 2,
    canvas.height - 20
  ]);
};

const downloadCanvas = (link, canvasId, filename) => {
  link.href = document.getElementById(canvasId).toDataURL();
  link.download = filename;
};

const displayError = error => {
  renderView("error", renderError(error));
  console.log(error);
};

// Event Listeners
document.getElementById("body").addEventListener("click", event => {
  switch (event.target.id) {
    case "js-download--1":
    case "js-download--2":
    case "js-download--3":
      downloadCanvas(event.target, "js-canvas", "MyTop4InstagramPhotosof2017.jpg");
      break;
    case "js-login":
      renderView("loading");
      break;
  }
});
