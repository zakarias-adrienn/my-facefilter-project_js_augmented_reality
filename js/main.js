"use strict";

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

function onGraduationClicked(event) {
  // delete previous filter
  chosenFilter = "graduation";
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

function onPumpkinClicked(event) {
  // delete previous filter
  chosenFilter = "pumpkin";
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

function onSunClicked(event) {
  // delete previous filter
  chosenFilter = "sunhat";
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

function onOfficerClicked(event) {
  // delete previous filter
  chosenFilter = "officer";
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

function onPartyClicked(event) {
  // delete previous filter
  chosenFilter = "partyhat";
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

function onFlowerClicked(event) {
  // delete previous filter
  chosenFilter = "flower";
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

function onGlassesClicked(event) {
  // delete previous filter
  chosenFilter = "glasses";
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

function onAlvinClicked(event) {
  // delete previous filter
  chosenFilter = "alvin";
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

function onChefClicked(event) {
  // delete previous filter
  chosenFilter = "chef";
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

function onMustacheClicked(event) {
  // delete previous filter
  chosenFilter = "mustache";
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

function onVenetianClicked(event) {
  // delete previous filter
  chosenFilter = "venetian";
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

function onHelmetClicked(event) {
  // CREATE THE HELMET MESH AND ADD IT TO THE SCENE:
  chosenFilter = "helmet";
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

function onDogClicked(event) {
  chosenFilter = "dog";
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
  if (!arjsShown) {
    canvas.style.display = "none";
    button.style.display = "none";
    arjs.style.display = "block";
    event.target.value = "Back to filters!";
    arjsShown = true;
  } else {
    canvas.style.display = "block";
    button.style.display = "block";
    arjs.style.display = "none";
    event.target.value = "Look at planets in 3D 🌍";
    arjsShown = false;
  }
}

// CHANGE FILTERS

document
  .getElementById("graduation")
  .addEventListener("click", onGraduationClicked);

document.getElementById("cowboy").addEventListener("click", onCowboyClicked);
document.getElementById("boater").addEventListener("click", onBoaterClicked);
document.getElementById("pumpkin").addEventListener("click", onPumpkinClicked);
document.getElementById("wizard").addEventListener("click", onWizardClicked);
document.getElementById("sun").addEventListener("click", onSunClicked);
document.getElementById("officer").addEventListener("click", onOfficerClicked);
document.getElementById("party").addEventListener("click", onPartyClicked);
document.getElementById("flower").addEventListener("click", onFlowerClicked);
document.getElementById("glasses").addEventListener("click", onGlassesClicked);
document
  .getElementById("sunglass")
  .addEventListener("click", onSunGlassesClicked);
document.getElementById("alvin").addEventListener("click", onAlvinClicked);
document.getElementById("chef").addEventListener("click", onChefClicked);
document.getElementById("elegant").addEventListener("click", onElegantClicked);
document.getElementById("pirate").addEventListener("click", onPirateClicked);
document.getElementById("viking").addEventListener("click", onVikingClicked);
document.getElementById("crown").addEventListener("click", onCrownClicked);
document
  .getElementById("mustache")
  .addEventListener("click", onMustacheClicked);
document.getElementById("helmet").addEventListener("click", onHelmetClicked);
document.getElementById("dog").addEventListener("click", onDogClicked);
document.getElementById("button").addEventListener("click", createImage);
document
  .getElementById("venetian")
  .addEventListener("click", onVenetianClicked);
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

//TODO: AR.JS
document.getElementById("marker").addEventListener("click", onMarkerClicked);
