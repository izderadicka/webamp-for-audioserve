"use strict"

import Webamp from "webamp"; // eslint-disable-line import/no-unresolved
import base64js from "base64-js";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./win95.css";
import "./styles.css";

const main = function () {

  let audioserveURL = "http://localhost:3000";
  //const AUDIOSERVE_SECRET = "kulisak";
  const audioserveSecret = "mypass";

  let currentFolder = "";

  const toggle = (id) => {
    let x = document.getElementById(id);
    x.classList.toggle("hidden");

  }

  const login = (secret) => {
    let secretBytes = new (TextEncoder)("utf-8").encode(secret);
    let randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    let concatedBytes = new Uint8Array(secretBytes.length + randomBytes.length);
    concatedBytes.set(secretBytes);
    concatedBytes.set(randomBytes, secretBytes.length);
    let digestPromise;
    if (!window.crypto.subtle) {
      digestPromise = Promise.resolve(sha256.arrayBuffer(concatedBytes));
    } else {
      digestPromise = window.crypto.subtle.digest('SHA-256', concatedBytes);
    }
    return digestPromise
      .then(s => {
        let secret = base64js.fromByteArray(randomBytes) + "|" + base64js.fromByteArray(new Uint8Array(s));
        let form = new URLSearchParams();
        form.append("secret", secret);
        return fetch(audioserveURL + "/authenticate", {
          method: "POST",
          body: form,
          mode: "cors",
          credentials: "include",
        });
      });
  }

  let select = document.getElementById("folder-list");
  select.addEventListener("change", evt => {
    let sel = select.selectedOptions[0];
    let path = sel.value;
    console.log("Moving to", path);

    loadFolder(path);
  })

  let loadFolder = (folder) => {

    return fetch(audioserveURL + '/folder/' + folder, {
      method: "GET",
      mode: "cors",
      credentials: "include",
    })
      .then((resp) => {
        if (resp.status == 200) {
          return resp.json()
        } else {
          throw new Error("Error reponse from server: " + resp.status + " " + resp.statusText);
        }
      })
      .then((list) => {
        currentFolder = folder;
        let folders = list.subfolders;


        select.length = 0;
        let add_opt = (val, text) => {
          let opt = document.createElement("option");
          opt.value = val;
          opt.text = text;
          select.add(opt)
        }
        add_opt("", "");
        let parent = folder.match(/(.*)\//);
        add_opt(parent ? parent[1] : "", "..");

        folders.forEach(af => {
          add_opt(af.path, af.name);
        });

        let files = list.files;
        console.log("Audio: ", files);
        const transSel = document.getElementById("trans-select");
        const ts = transSel.selectedOptions[0].value;
        let pl = files.map(item => {
          return {
            metaData: {
              title: item.name
            },
            url: audioserveURL + "/audio/" + item.path + "?trans="+ts,
            duration: item.meta.duration
          }
        })
        document.getElementById("current-path").innerText = folder;
        player.setTracksToPlay(pl);

      })
      .catch((e) => console.error(e))
  };

  const prepareLogin = () => {
    const url = document.getElementById("server-url");
    url.value = audioserveURL;

    document.getElementById("btn-login").addEventListener("click", (evt) => {
      audioserveURL=url.value;
      loadFolder("")
      .then( () => {
      toggle("card-folders");
      toggle("card-login");
      });
    })
  }

  prepareLogin();

  // if (AUDIOSERVE_SECRET) {
  //   login(AUDIOSERVE_SECRET)
  //     .then(() =>
  //       loadFolder(""));
  // } else {
  //   loadFolder("");
  // }

  const player = new Webamp();

  document.getElementById("icon-winamp").addEventListener("click", (evt) => {
    player.reopen();
  })

  document.getElementById("icon-help").addEventListener("click", (evt) => toggle("card-help"));

  document.getElementById("btn-reload-folder").addEventListener("click", (evt) => {
    loadFolder(currentFolder);
  })

  player.renderWhenReady(document.getElementById("app"));
}();
