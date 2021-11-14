"use strict";

let graduationLi = document.getElementById("graduation");
let cowboyLi = document.getElementById("cowboy");
let boaterLi = document.getElementById("boater");
let pumpkinLi = document.getElementById("pumpkin");
let wizardLi = document.getElementById("wizard");
let sunhatLi = document.getElementById("sun");
let officerLi = document.getElementById("officer");
let partyLi = document.getElementById("party");
let flowerLi = document.getElementById("flower");
let glassesLi = document.getElementById("glasses");
let chefLi = document.getElementById("chef");
let alvinLi = document.getElementById("alvin");
let sunglassLi = document.getElementById("sunglass");
let elegantLi = document.getElementById("elegant");
let pirateLi = document.getElementById("pirate");
let vikingLi = document.getElementById("viking");
let helmetLi = document.getElementById("helmet");
let mustacheLi = document.getElementById("mustache");
let crownLi = document.getElementById("crown");
let dogLi = document.getElementById("dog");
let venetianLi = document.getElementById("venetian");

const modelParams = {
  flipHorizontal: true,
  maxNumBoxes: 2,
  iouThreshold: 0.5,
  scoreThreshold: 0.8,
};
let model;
handTrack.load(modelParams).then((mdl) => {
  model = mdl;
  console.log("model loaded");
});

// arjs
let arjsShown = false;

// settings:
const SETTINGS = {
  maxFaces: 1, // max number of detected faces, i may change!!! but then faceObjects foreach down!
};

// animation:
let ARRAY_BILLS = [];

// globals:
let THREECAMERA = null;
let MESH = null;
let OBJECT = null;
let ISDETECTED = null;
let threeStuffs = null;
let chosenFilter = null;
let contextAudio = null;
let around = null;
let bufferLoader = null;
let musicStopped = false;
let canvas = document.getElementById("jeeFaceFilterCanvas");

// AUDIO: BUFFERLOADER
function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function (url, index) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function () {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function (buffer) {
        if (!buffer) {
          alert("error decoding file data: " + url);
          return;
        }
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      },
      function (error) {
        console.error("decodeAudioData error", error);
      }
    );
  };

  request.onerror = function () {
    alert("BufferLoader: XHR error");
  };

  request.send();
};

BufferLoader.prototype.load = function () {
  for (var i = 0; i < this.urlList.length; ++i)
    this.loadBuffer(this.urlList[i], i);
};

// callback: launched if a face is detected or lost
function detect_callback(faceIndex, isDetected) {
  if (isDetected) {
    console.log("INFO in detect_callback(): face n°", faceIndex, "DETECTED");
  } else {
    console.log("INFO in detect_callback(): face n°", faceIndex, "LOST");
  }
}

function initializeBills() {
  ARRAY_BILLS = [];
  const billGeometry = new THREE.PlaneGeometry(0.2, 0.2);
  // Position each bill randomly + add animations:
  for (let i = 0; i < 5; i++) {
    const billMaterial = new THREE.MeshLambertMaterial({
      // map: new THREE.TextureLoader().load("../models/billet_50.png"),
      color: "#000000".replace(/0/g, function () {
        return (~~(Math.random() * 16)).toString(16);
      }),
      side: THREE.DoubleSide,
      // transparent: true
    });
    const xRand = Math.random() * 1 - 0.5;
    const yRand = 3;
    const zRand = Math.random() * 3 - 1.5 - 1.5;

    const billMesh = new THREE.Mesh(billGeometry, billMaterial);
    billMesh.renderOrder = 100;
    billMesh.frustumCulled = false;
    billMesh.visible = false;

    billMesh.position.set(xRand, yRand, zRand);
    billMesh.rotation.y = xRand;
    billMesh.rotation.z = zRand;

    billMesh.scale.multiplyScalar(0.4);
    billMesh.scale.z = xRand * 10;

    ARRAY_BILLS.push(billMesh);
  }
}

// build the 3D. called once when Jeeliz Face Filter is OK
function init_threeScene(spec) {
  threeStuffs = JeelizThreeHelper.init(spec, detect_callback);

  // CREATE LIGHT
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  threeStuffs.scene.add(ambientLight);

  // CREATE THE CAMERA:
  THREECAMERA = JeelizThreeHelper.create_camera();

  initializeBills();
}

// Entry point, launched by body.onload():
function main() {
  JEELIZFACEFILTER.init({
    canvasId: "jeeFaceFilterCanvas",
    NNCPath: "/neuralNets/", // root of NN_DEFAULT.json file
    maxFacesDetected: SETTINGS.maxFaces,
    callbackReady: function (errCode, spec) {
      if (errCode) {
        console.log("AN ERROR HAPPENS. SORRY BRO :( . ERR =", errCode);
        return;
      }

      console.log("INFO: JEELIZFACEFILTER IS READY");
      init_threeScene(spec);
    },

    // called at each render iteration (drawing loop)
    callbackTrack: function (detectState) {
      if (
        JeelizThreeHelper.get_isDetected() &&
        detectState.expressions[0] > 0.9
      ) {
        ARRAY_BILLS.forEach((bill, i) => {
          setTimeout(() => {
            animateBill(bill, i);
            threeStuffs.scene.add(bill);
          }, 500 * i);
        });
      }

      JeelizThreeHelper.render(detectState, THREECAMERA);
    },
  });
}

function startAudio(music) {
  if (!musicStopped) {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      contextAudio = new AudioContext();
    } catch (e) {
      console.log("Web Audio API is not supported in this browser.");
    }
    if (contextAudio) {
      bufferLoader = new BufferLoader(
        contextAudio,
        [`../audio/${music}.mp3`],
        (bufferList) => {
          around = contextAudio.createBufferSource();

          around.buffer = bufferList[0];

          around.connect(contextAudio.destination);
          around.start();
        }
      );
      bufferLoader.load();
    }
  }
}

function addActiveClass(chosenFilter) {
  graduationLi.classList.remove("active");
  cowboyLi.classList.remove("active");
  boaterLi.classList.remove("active");
  pumpkinLi.classList.remove("active");
  wizardLi.classList.remove("active");
  sunhatLi.classList.remove("active");
  officerLi.classList.remove("active");
  partyLi.classList.remove("active");
  flowerLi.classList.remove("active");
  glassesLi.classList.remove("active");
  chefLi.classList.remove("active");
  alvinLi.classList.remove("active");
  sunglassLi.classList.remove("active");
  elegantLi.classList.remove("active");
  pirateLi.classList.remove("active");
  vikingLi.classList.remove("active");
  crownLi.classList.remove("active");
  helmetLi.classList.remove("active");
  mustacheLi.classList.remove("active");
  crownLi.classList.remove("active");
  dogLi.classList.remove("active");
  venetianLi.classList.remove("active");
  switch (chosenFilter) {
    case "graduation":
      graduationLi.classList.add("active");
      break;
    case "cowboy":
      cowboyLi.classList.add("active");
      break;
    case "boater":
      boaterLi.classList.add("active");
      break;
    case "pumpkin":
      pumpkinLi.classList.add("active");
      break;
    case "wizard":
      wizardLi.classList.add("active");
      break;
    case "alvin":
      alvinLi.classList.add("active");
      break;
    case "party":
      partyLi.classList.add("active");
      break;
    case "sunhat":
      sunhatLi.classList.add("active");
      break;
    case "officer":
      officerLi.classList.add("active");
      break;
    case "dog":
      dogLi.classList.add("active");
      break;
    case "chef":
      chefLi.classList.add("active");
      break;
    case "elegant":
      elegantLi.classList.add("active");
      break;
    case "pirate":
      pirateLi.classList.add("active");
      break;
    case "viking":
      vikingLi.classList.add("active");
      break;
    case "crown":
      crownLi.classList.add("active");
      break;
    case "glasses":
      glassesLi.classList.add("active");
      break;
    case "sunglass":
      sunglassLi.classList.add("active");
      break;
    case "flower":
      flowerLi.classList.add("active");
      break;
    case "mustache":
      mustacheLi.classList.add("active");
      break;
    case "helmet":
      helmetLi.classList.add("active");
      break;
    case "venetian":
      venetianLi.classList.add("active");
      break;
  }
}

function onGraduationClicked(event) {
  // delete previous filter
  chosenFilter = "graduation";
  addActiveClass(chosenFilter);
  if (around != null) {
    if (around != null) {
      around.stop();
    }
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/university.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(1.2);
      MESH.rotation.set(0, -60, 0);
      MESH.position.set(0.0, 1.2, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  // INIT WEB AUDIO
  startAudio("gaudeamus");
}

function onCowboyClicked(event) {
  // delete previous filter
  chosenFilter = "cowboy";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/cowboy.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(1.1); //milyen nagy
      MESH.rotation.set(0, -80, 0);
      MESH.position.set(0.0, 1.6, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("cowboy");
}

function onBoaterClicked(event) {
  // delete previous filter
  chosenFilter = "boater";
  addActiveClass("boater");
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];

  const loader = new THREE.BufferGeometryLoader();
  loader.load(
    "../models/luffys_hat.json",
    function (geometry, materials) {
      const mat = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load("../models/Texture.jpg"),
      });
      const hatMesh = new THREE.Mesh(geometry, mat);

      hatMesh.scale.multiplyScalar(1.1);
      hatMesh.rotation.set(0.2, -40, 0);
      hatMesh.position.set(0.0, 0.9, 0.2);
      hatMesh.frustumCulled = false;
      hatMesh.side = THREE.DoubleSide;

      threeStuffs.faceObject.add(hatMesh);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("boat");
}

function onSunClicked(event) {
  // delete previous filter
  chosenFilter = "sunhat";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/sunhat.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.18); //milyen nagy
      MESH.rotation.set(0.15, 6, 0);
      MESH.position.set(0, 0.47, 0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("sun");
}

function onPumpkinClicked(event) {
  // delete previous filter
  chosenFilter = "pumpkin";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/pumpkin.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(1.7); //milyen nagy
      MESH.rotation.set(0.2, 0, 0);
      MESH.position.set(0, 0.7, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("halloween");
}

function onWizardClicked(event) {
  // delete previous filter
  chosenFilter = "wizard";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/wizard.gltf",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(1.2); //milyen nagy
      MESH.rotation.set(0.3, -70, 0);
      MESH.position.set(0, 1.9, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("wizard");
}

function onPartyClicked(event) {
  // delete previous filter
  chosenFilter = "party";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/party.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.33); //milyen nagy
      MESH.rotation.set(0.2, 0, 0);
      MESH.position.set(-0.1, 2.1, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("party");
}

function onAlvinClicked(event) {
  // delete previous filter
  chosenFilter = "alvin";
  addActiveClass("alvin");
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/alvinhat.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(1.1);
      MESH.rotation.set(0.35, 0, 0);
      MESH.position.set(0.0, 0.7, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("alvin");
}

function onOfficerClicked(event) {
  // delete previous filter
  chosenFilter = "officer";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/formal.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.65); //milyen nagy
      MESH.rotation.set(0.3, 0, 0);
      MESH.position.set(0, 0.9, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("officer");
}

function onDogClicked(event) {
  chosenFilter = "dog";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];

  let DOGOBJ3D = new THREE.Object3D();
  let NOSEMESH = null,
    EARMESH = null;

  // let's begin by creating a loading manager that will allow us to
  // have more control over the three parts of our dog model
  const loadingManager = new THREE.LoadingManager();

  const loaderEars = new THREE.BufferGeometryLoader(loadingManager);

  loaderEars.load("../models/dog_ears.json", (geometry) => {
    const mat = new THREE.MeshPhongMaterial({
      map: new THREE.TextureLoader().load("../models/texture_ears.jpg"),
      reflectionRatio: 1,
      shininess: 50,
    });

    EARMESH = new THREE.Mesh(geometry, mat);
    EARMESH.scale.multiplyScalar(0.025);
    EARMESH.position.setY(-0.2);
    EARMESH.frustumCulled = false;
    EARMESH.renderOrder = 10000;
  });
  // CREATE OUR DOG NOSE
  const loaderNose = new THREE.BufferGeometryLoader(loadingManager);

  loaderNose.load("../models/dog_nose.json", function (geometry) {
    const mat = new THREE.MeshPhongMaterial({
      map: new THREE.TextureLoader().load("../models/texture_nose.jpg"),
      shininess: 1.5,
      specular: 0xffffff,
      bumpMap: new THREE.TextureLoader().load("../models/normal_nose.jpg"),
      bumpScale: 0.005,
    });

    NOSEMESH = new THREE.Mesh(geometry, mat);
    NOSEMESH.scale.multiplyScalar(0.018);
    NOSEMESH.position.setZ(0.15);
    NOSEMESH.frustumCulled = false;
    NOSEMESH.renderOrder = 10000;
  });

  const _quat = new THREE.Quaternion();
  const _eul = new THREE.Euler();
  _eul.setFromQuaternion(_quat);

  loadingManager.onLoad = () => {
    DOGOBJ3D.add(EARMESH);
    DOGOBJ3D.add(NOSEMESH);

    threeStuffs.faceObject.add(DOGOBJ3D);
  };

  startAudio("dog");
}

function onChefClicked(event) {
  // delete previous filter
  chosenFilter = "chef";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/chef.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.13);
      MESH.rotation.set(0.15, 0, 0);
      MESH.position.set(0.0, -1.1, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("chef");
}

function onElegantClicked(event) {
  // delete previous filter
  chosenFilter = "elegant";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/elegant.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(2.5);
      MESH.rotation.set(0, 0.0, 0);
      MESH.position.set(-0.2, -8, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("elegant");
}

function onPirateClicked(event) {
  // delete previous filter
  chosenFilter = "pirate";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/pirate.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(1);
      MESH.rotation.set(0, 66, 0);
      MESH.position.set(0, 1.2, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("pirate");
}

function onVikingClicked(event) {
  // delete previous filter
  chosenFilter = "viking";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/viking.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.9);
      MESH.rotation.set(0, 59, 0);
      MESH.position.set(0, 1.32, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("viking");
}

function onCrownClicked(event) {
  // delete previous filter
  chosenFilter = "crown";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/crown.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.066);
      MESH.rotation.set(0.4, 11, 0);
      MESH.position.set(0.0, 1, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("crown");
}

function onGlassesClicked(event) {
  // delete previous filter
  chosenFilter = "glasses";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/glasses.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.9); //milyen nagy
      MESH.rotation.set(0, 0, 0);
      MESH.position.set(-0.05, 0.35, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("glass");
}

function onSunGlassesClicked(event) {
  // delete previous filter
  chosenFilter = "sunglass";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/glazz.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.098); //milyen nagy
      MESH.rotation.set(0, 0, 0);
      MESH.position.set(-0.05, 0.38, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("sunglass");
}

function onFlowerClicked(event) {
  // delete previous filter
  chosenFilter = "flower";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/flower.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(1.3); //milyen nagy
      MESH.rotation.set(0, 70, 1);
      MESH.position.set(-0.5, 0.8, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("flower");
}

function onMustacheClicked(event) {
  // delete previous filter
  chosenFilter = "mustache";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/mustache.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(0.2);
      MESH.rotation.set(0, 0, 0);
      MESH.position.set(-0.05, -0.152, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("mustache");
}

function onHelmetClicked(event) {
  // CREATE THE HELMET MESH AND ADD IT TO THE SCENE:
  chosenFilter = "helmet";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];

  const HELMETOBJ3D = new THREE.Object3D();
  let helmetMesh = null,
    visorMesh = null,
    faceMesh = null;

  const loadingManager = new THREE.LoadingManager();
  const helmetLoader = new THREE.BufferGeometryLoader(loadingManager);

  helmetLoader.load("../models/helmet.json", (helmetGeometry) => {
    const helmetMaterial = new THREE.MeshPhongMaterial({
      map: new THREE.TextureLoader().load("../models/diffuse_helmet.jpg"),
      reflectionRatio: 1,
      shininess: 50,
    });

    helmetMesh = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmetMesh.scale.multiplyScalar(0.037);
    helmetMesh.position.y -= 0.3;
    helmetMesh.position.z -= 0.5;
    helmetMesh.rotation.x += 0.5;
  });

  const visiereLoader = new THREE.BufferGeometryLoader(loadingManager);
  visiereLoader.load("../models/visiere.json", (visiereGeometry) => {
    const visiereMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.FrontSide,
    });

    visorMesh = new THREE.Mesh(visiereGeometry, visiereMaterial);
    visorMesh.scale.multiplyScalar(0.037);
    visorMesh.position.y -= 0.3;
    visorMesh.position.z -= 0.5;
    visorMesh.rotation.x += 0.5;
    visorMesh.frustumCulled = false;
  });

  // CREATE THE MASK
  const maskLoader = new THREE.BufferGeometryLoader(loadingManager);
  /*
     faceLowPolyEyesEarsFill.json has been exported from dev/faceLowPolyEyesEarsFill.blend
     using THREE.JS blender exporter with Blender v2.76
   */
  maskLoader.load(
    "../models/faceLowPolyEyesEarsFill2.json",
    function (maskBufferGeometry) {
      const vertexShaderSource =
        "uniform mat2 videoTransformMat2;\n\
     varying vec2 vUVvideo;\n\
     varying float vY, vNormalDotZ;\n\
     const float THETAHEAD = 0.25;\n\
     \n\
     void main() {\n\
       vec4 mvPosition = modelViewMatrix * vec4( position, 1.0);\n\
       vec4 projectedPosition = projectionMatrix * mvPosition;\n\
       gl_Position = projectedPosition;\n\
       \n\
       // compute UV coordinates on the video texture:\n\
       vec4 mvPosition0 = modelViewMatrix * vec4( position, 1.0 );\n\
       vec4 projectedPosition0 = projectionMatrix * mvPosition0;\n\
       vUVvideo = vec2(0.5,0.5) + videoTransformMat2 * projectedPosition0.xy/projectedPosition0.w;\n\
       vY = position.y*cos(THETAHEAD)-position.z*sin(THETAHEAD);\n\
       vec3 normalView = vec3(modelViewMatrix * vec4(normal,0.));\n\
       vNormalDotZ = pow(abs(normalView.z), 1.5);\n\
     }";

      const fragmentShaderSource =
        "precision lowp float;\n\
     uniform sampler2D samplerVideo;\n\
     varying vec2 vUVvideo;\n\
     varying float vY, vNormalDotZ;\n\
     void main() {\n\
       vec3 videoColor = texture2D(samplerVideo, vUVvideo).rgb;\n\
       float darkenCoeff = smoothstep(-0.15, 0.05, vY);\n\
       float borderCoeff = smoothstep(0.0, 0.55, vNormalDotZ);\n\
       gl_FragColor = vec4(videoColor * (1.-darkenCoeff), borderCoeff );\n\
     }";

      const mat = new THREE.ShaderMaterial({
        vertexShader: vertexShaderSource,
        fragmentShader: fragmentShaderSource,
      });
      maskBufferGeometry.computeVertexNormals();
      faceMesh = new THREE.Mesh(maskBufferGeometry, mat);
      faceMesh.renderOrder = -10000;
      faceMesh.frustumCulled = false;
      faceMesh.scale.multiplyScalar(1.12);
      faceMesh.position.set(0, 0.3, -0.25);
    }
  );

  loadingManager.onLoad = () => {
    HELMETOBJ3D.add(helmetMesh);
    HELMETOBJ3D.add(visorMesh);
    HELMETOBJ3D.add(faceMesh);

    threeStuffs.faceObject.add(HELMETOBJ3D);
  };

  startAudio("helmet");
}

function onVenetianClicked(event) {
  // delete previous filter
  chosenFilter = "venetian";
  addActiveClass(chosenFilter);
  if (around != null) {
    around.stop();
  }

  threeStuffs.faceObject.children = [];
  const loader = new THREE.GLTFLoader();

  loader.load(
    "../models/venetian3.glb",
    function (glb) {
      MESH = glb.scene;
      MESH.frustumCulled = false;
      MESH.side = THREE.DoubleSide;
      MESH.scale.multiplyScalar(2.5);
      MESH.rotation.set(0, 0, 0);
      MESH.position.set(0.0, -0.15, 0.0); //milyen magasan van
      OBJECT = new THREE.Object3D();
      OBJECT.add(MESH);

      threeStuffs.faceObject.add(OBJECT);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error(error);
    }
  );

  startAudio("venetian");
}

let billCount = 0;

function animateBill(mesh, index) {
  billCount++;
  if (billCount == 10) {
    initializeBills();
    billCount = 0;
  }
  mesh.visible = true;

  let count = 0;
  var interval = setInterval(() => {
    if (mesh.position.y < -3) {
      mesh.position.y = 3;
    }
    mesh.position.x =
      mesh.position.x + 0.005 * Math.cos((Math.PI / 40) * count);

    mesh.position.y -= 0.01;

    mesh.rotation.y =
      mesh.rotation.y + 0.005 * Math.cos((Math.PI / 40) * count);
    mesh.rotation.x += 0.03;
    mesh.rotation.z += 0.02;

    count += 0.9;
  }, 16);
  setTimeout(() => {
    clearInterval(interval);
    threeStuffs.scene.remove(mesh);
  }, 3000);
}

function createImage(event) {
  var url = canvas.toDataURL();

  var link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("target", "_blank");
  if (!chosenFilter) {
    link.setAttribute("download", "simple");
  } else {
    link.setAttribute("download", chosenFilter);
  }

  link.click();
}

function onMarkerClicked(event) {
  let button = document.getElementById("button");
  let arjs = document.getElementById("arjs");
  let download = document.getElementById("download");
  if (!arjsShown) {
    download.style.display = "block";
    canvas.style.display = "none";
    button.style.display = "none";
    arjs.style.display = "block";
    event.target.value = "Back to filters!";
    arjsShown = true;
  } else {
    download.style.display = "none";
    canvas.style.display = "block";
    button.style.display = "block";
    arjs.style.display = "none";
    event.target.value = "Look at planets in 3D 🌍";
    arjsShown = false;
  }
}

function getWeather(e) {
  let location = document.getElementById("location");
  let place = location.value;
  console.log(place);

  const xhr = new XMLHttpRequest();
  xhr.open(
    "GET",
    `https://api.openweathermap.org/data/2.5/weather?q=${place}&units=metric&mode=json&appid=8848cf086e99f337aa30552c953f0eb3`
  );
  xhr.send();
  xhr.onload = () => {
    // we can change the data type to json also by
    const data = JSON.parse(xhr.response);
    console.log(data.weather[0].main);
    let mainWeather = data.weather[0].main;
    console.log(data.main.temp);
    let celsius = parseInt(data.main.temp, 10);

    const fontLoader = new THREE.FontLoader();

    fontLoader.load("../models/font.json", (font) => {
      const textGeometry = new THREE.TextGeometry(`${celsius} °C`, {
        font: font,
        size: 0.25,
        height: 0.1,
        curveSegments: 12,
      });

      const textMesh = new THREE.Mesh(
        textGeometry,
        new THREE.MeshBasicMaterial({
          color: 0x000000,
        })
      );
      textMesh.position.x -= 0.5;
      textMesh.position.y -= 1;
      threeStuffs.faceObject.add(textMesh);
    });

    chosenFilter = "weather";
    if (around != null) {
      around.stop();
    }

    threeStuffs.faceObject.children = [];

    const loader = new THREE.GLTFLoader();

    switch (mainWeather) {
      case "Thunderstorm":
        loader.load(
          "../models/umbrella.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.11);
            MESH.rotation.set(0, 4, 0);
            MESH.position.set(0.75, -0.4, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        break;
      case "Drizzle":
        loader.load(
          "../models/umbrella.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.11);
            MESH.rotation.set(0, 4, 0);
            MESH.position.set(0.75, -0.4, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        break;
      case "Rain":
        loader.load(
          "../models/umbrella.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.11);
            MESH.rotation.set(0, 4, 0);
            MESH.position.set(0.75, -0.4, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        break;
      case "Snow":
        loader.load(
          "../models/snow.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.1);
            MESH.rotation.set(0, 4, 0);
            MESH.position.set(-2, 1.5, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        loader.load(
          "../models/snow.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.1);
            MESH.rotation.set(0, 4, 0);
            MESH.position.set(-0.6, 1.6, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        break;
      case "Clear":
        loader.load(
          "../models/sundraw.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.02);
            MESH.rotation.set(0, 10, 0);
            MESH.position.set(-1.5, 1.5, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        break;
      case "Clouds":
        loader.load(
          "../models/cloud.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.25);
            MESH.rotation.set(0, 0, 0);
            MESH.position.set(-1.5, 1.5, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        loader.load(
          "../models/cloud.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.25);
            MESH.rotation.set(0, 0, 0);
            MESH.position.set(0.4, 1.5, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        break;
      default:
        loader.load(
          "../models/cloud.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.25);
            MESH.rotation.set(0, 0, 0);
            MESH.position.set(-1.5, 1.5, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        loader.load(
          "../models/cloud.glb",
          function (glb) {
            MESH = glb.scene;
            MESH.frustumCulled = false;
            MESH.side = THREE.DoubleSide;
            MESH.scale.multiplyScalar(0.25);
            MESH.rotation.set(0, 0, 0);
            MESH.position.set(0.4, 1.5, 0); //milyen magasan van
            OBJECT = new THREE.Object3D();
            OBJECT.add(MESH);

            threeStuffs.faceObject.add(OBJECT);
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          function (error) {
            console.error(error);
          }
        );
        break;
    }
  };
  let weather = document.getElementById("weather");
  weather.style.display = "none";
  location.style.display = "none";
  let showWeather = document.getElementById("showweather");
  showWeather.style.display = "block";
}

function showWeather() {
  let weather = document.getElementById("weather");
  weather.style.display = "block";
  let location = document.getElementById("location");
  location.style.display = "block";
  location.value = "";
  location.placeHolder = "Enter location...";
  let showWeather = document.getElementById("showweather");
  showWeather.style.display = "none";
}

// CHANGE FILTERS

graduationLi.addEventListener("click", onGraduationClicked);
cowboyLi.addEventListener("click", onCowboyClicked);
boaterLi.addEventListener("click", onBoaterClicked);
pumpkinLi.addEventListener("click", onPumpkinClicked);
wizardLi.addEventListener("click", onWizardClicked);
sunhatLi.addEventListener("click", onSunClicked);
officerLi.addEventListener("click", onOfficerClicked);
partyLi.addEventListener("click", onPartyClicked);
flowerLi.addEventListener("click", onFlowerClicked);
glassesLi.addEventListener("click", onGlassesClicked);
sunglassLi.addEventListener("click", onSunGlassesClicked);
alvinLi.addEventListener("click", onAlvinClicked);
chefLi.addEventListener("click", onChefClicked);
elegantLi.addEventListener("click", onElegantClicked);
pirateLi.addEventListener("click", onPirateClicked);
vikingLi.addEventListener("click", onVikingClicked);
crownLi.addEventListener("click", onCrownClicked);
mustacheLi.addEventListener("click", onMustacheClicked);
helmetLi.addEventListener("click", onHelmetClicked);
dogLi.addEventListener("click", onDogClicked);
document.getElementById("button").addEventListener("click", createImage);
venetianLi.addEventListener("click", onVenetianClicked);
document.getElementById("hand").addEventListener("click", () => {
  chosenFilter = "hand";
  threeStuffs.faceObject.children = [];
  if (around != null) {
    around.stop();
  }

  const fontLoader = new THREE.FontLoader();

  fontLoader.load("../models/font.json", (font) => {
    const textGeometry = new THREE.TextGeometry("Raise your hand!", {
      font: font,
      size: 0.25,
      height: 0.1,
      curveSegments: 12,
    });

    const textMesh = new THREE.Mesh(
      textGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x000000,
      })
    );

    textMesh.position.x -= 1.5;
    textMesh.position.y += 1.5;
    threeStuffs.faceObject.add(textMesh);
  });

  setTimeout(() => {
    for (let i = 0; i < 10; ++i) {
      model.detect(canvas).then((predictions) => {
        let hands = predictions.filter((p) => p.label != "face");
        let hand = hands[0];
        console.log(hand);

        if (hand) {
          threeStuffs.faceObject.children = [];
        }
      });
    }
  }, 4000);
});
document.getElementById("music").addEventListener("click", (event) => {
  const btn = event.target;
  if (btn.value === "Stop music 🔈") {
    musicStopped = true;
    if (around) {
      around.stop();
    }
    btn.value = "Start music 🔊";
  } else {
    musicStopped = false;
    btn.value = "Stop music 🔈";
  }
});

document.getElementById("marker").addEventListener("click", onMarkerClicked);
document.getElementById("weather").addEventListener("click", getWeather);
document.getElementById("showweather").addEventListener("click", showWeather);

window.addEventListener(
  "keydown",
  (event) => {
    switch (event.key) {
      case "ArrowLeft":
        // Left pressed
        if (!chosenFilter) {
          graduationLi.click();
        } else {
          switch (chosenFilter) {
            case "graduation":
              chosenFilter = null;
              break;
            case "cowboy":
              graduationLi.click();
              break;
            case "boater":
              cowboyLi.click();
              break;
            case "sunhat":
              boaterLi.click();
              break;
            case "pumpkin":
              sunhatLi.click();
              break;
            case "wizard":
              pumpkinLi.click();
              break;
            case "party":
              wizardLi.click();
              break;
            case "alvin":
              partyLi.click();
              break;
            case "officer":
              alvinLi.click();
              break;
            case "dog":
              officerLi.click();
              break;
            case "chef":
              dogLi.click();
              break;
            case "elegant":
              chefLi.click();
              break;
            case "pirate":
              elegantLi.click();
              break;
            case "viking":
              pirateLi.click();
              break;
            case "crown":
              glassesLi.click();
              vikingLi;
            case "glasses":
              crownLi.click();
              break;
            case "sunglass":
              glassesLi.click();
              break;
            case "flower":
              sunglassLi.click();
              break;
            case "mustache":
              flowerLi.click();
              break;
            case "helmet":
              mustacheLi.click();
              break;
            case "venetian":
              helmetLi.click();
              break;
          }
        }
        break;
      case "ArrowRight":
        // Right pressed
        if (!chosenFilter) {
          graduationLi.click();
        } else {
          switch (chosenFilter) {
            case "graduation":
              cowboyLi.click();
              break;
            case "cowboy":
              boaterLi.click();
              break;
            case "boater":
              sunhatLi.click();
              break;
            case "sunhat":
              pumpkinLi.click();
              break;
            case "pumpkin":
              wizardLi.click();
              break;
            case "wizard":
              partyLi.click();
              break;
            case "party":
              alvinLi.click();
              break;
            case "alvin":
              officerLi.click();
              break;
            case "officer":
              dogLi.click();
              break;
            case "dog":
              chefLi.click();
              break;
            case "chef":
              elegantLi.click();
              break;
            case "elegant":
              pirateLi.click();
              break;
            case "pirate":
              vikingLi.click();
              break;
            case "viking":
              crownLi.click();
              break;
            case "crown":
              glassesLi.click();
              break;
            case "glasses":
              sunglassLi.click();
              break;
            case "sunglass":
              flowerLi.click();
              break;
            case "flower":
              mustacheLi.click();
              break;
            case "mustache":
              helmetLi.click();
              break;
            case "helmet":
              venetianLi.click();
              break;
            case "venetian":
              chosenFilter = null;
              break;
          }
        }
        break;
    }
  },
  true
);
