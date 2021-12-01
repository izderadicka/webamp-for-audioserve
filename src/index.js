"use strict"

import Webamp from "webamp"; // eslint-disable-line import/no-unresolved
import base64js from "base64-js";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./win95.css";

const main = function () {

  const AUDIOSERVE_URL = "http://localhost:3000";
  //const AUDIOSERVE_SECRET = "kulisak";
  const AUDIOSERVE_SECRET = null;

  let login = (secret) => {
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
        return fetch(AUDIOSERVE_URL + "/authenticate", {
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

    return fetch(AUDIOSERVE_URL + '/folder/' + folder, {
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
            url: AUDIOSERVE_URL + "/audio/" + item.path + "?trans="+ts,
            duration: item.meta.duration
          }
        })
        document.getElementById("current-path").innerText = folder;
        player.setTracksToPlay(pl);

      })
      .catch((e) => console.error(e))
  };
  if (AUDIOSERVE_SECRET) {
    login(AUDIOSERVE_SECRET)
      .then(() =>
        loadFolder(""));
  } else {
    loadFolder("");
  }

  const player = new Webamp();

  player.renderWhenReady(document.getElementById("app"));
}();
