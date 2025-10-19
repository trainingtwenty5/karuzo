import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdhMIiqetOfDGP85ERxtgwn3AXR50pBcE",
  authDomain: "base-468e0.firebaseapp.com",
  projectId: "base-468e0",
  storageBucket: "base-468e0.firebasestorage.app",
  messagingSenderId: "829161895559",
  appId: "1:829161895559:web:d832541aac05b35847ea22"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
auth.languageCode = "pl";

async function configurePersistence() {
  const persistenceChain = [
    ["indexedDB", indexedDBLocalPersistence],
    ["localStorage", browserLocalPersistence],
    ["session", browserSessionPersistence],
    ["memory", inMemoryPersistence]
  ];

  let lastError = null;
  for (const [label, persistence] of persistenceChain) {
    try {
      await setPersistence(auth, persistence);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Nie udało się ustawić persystencji Firebase (${label}).`, error);
    }
  }

  if (lastError) {
    console.error("❌ Wszystkie tryby persystencji Firebase nie powiodły się. Sesja może być niestabilna.", lastError);
  }
}

await configurePersistence();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const authButtons   = document.getElementById("authButtons");
const userMenu      = document.getElementById("userMenu");
const loginBtn      = document.getElementById("loginBtn");
const registerBtn   = document.getElementById("registerBtn");
const accountBtn    = document.getElementById("accountBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const loginModal    = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const loginForm     = document.getElementById("loginForm");
const registerForm  = document.getElementById("registerForm");
const googleBtnLogin    = document.getElementById("googleLoginBtnLogin");
const googleBtnRegister = document.getElementById("googleLoginBtn");
const switchToRegister  = document.getElementById("switchToRegister");
const switchToLogin     = document.getElementById("switchToLogin");
const mobileAuthC       = document.getElementById("mobileAuth");

const openModal = (modal) => { if (modal) modal.style.display = "flex"; };
const closeModal = (modal) => { if (modal) modal.style.display = "none"; };

loginBtn?.addEventListener("click", () => openModal(loginModal));
registerBtn?.addEventListener("click", () => openModal(registerModal));
switchToRegister?.addEventListener("click", (event) => {
  event.preventDefault();
  closeModal(loginModal);
  openModal(registerModal);
});
switchToLogin?.addEventListener("click", (event) => {
  event.preventDefault();
  closeModal(registerModal);
  openModal(loginModal);
});

document.querySelectorAll(".modal .modal-close").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.closest(".modal")));
});

window.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.classList.contains("modal")) {
    closeModal(event.target);
  }
});

(function domainHint() {
  const hint = document.getElementById("domainWarning");
  if (!hint) return;
  const knownGood = ["localhost", "127.0.0.1", "trainingtwenty5.github.io", "grunteo.pl", "grunte.pl"];
  if (!knownGood.includes(location.hostname)) {
    hint.style.display = "block";
  }
})();

function notify(message, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}

function niceAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "Nieprawidłowy adres e-mail.";
    case "auth/missing-password":
      return "Podaj hasło.";
    case "auth/invalid-credential":
      return "Nieprawidłowy e-mail lub hasło.";
    case "auth/user-not-found":
      return "Użytkownik nie istnieje.";
    case "auth/wrong-password":
      return "Błędne hasło.";
    case "auth/too-many-requests":
      return "Za dużo prób. Spróbuj ponownie później.";
    case "auth/unauthorized-domain":
      return `Domena ${location.hostname} nie jest autoryzowana w Firebase (Authentication → Authorized domains).`;
    case "auth/network-request-failed":
      return "Błąd sieci. Sprawdź połączenie z internetem.";
    case "auth/popup-closed-by-user":
      return "Zamykanie okna logowania przerwało proces.";
    case "auth/cancelled-popup-request":
      return "Logowanie zostało przerwane przez inne żądanie. Spróbuj ponownie.";
    case "auth/popup-blocked":
      return "Przeglądarka zablokowała okno logowania Google. Użyj przekierowania.";
    case "auth/operation-not-supported-in-this-environment":
      return "To środowisko nie wspiera tego typu logowania (np. file://). Uruchom stronę przez https.";
    default:
      return `Błąd: ${code || err?.message || "nieznany"}`;
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("loginEmail")?.value.trim();
  const pass = document.getElementById("loginPassword")?.value;
  if (!email || !pass) return;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (error) {
    console.error("[login]", error);
    notify(niceAuthError(error), "error");
  }
});

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("registerName")?.value.trim();
  const email = document.getElementById("registerEmail")?.value.trim();
  const pass1 = document.getElementById("registerPassword")?.value;
  const pass2 = document.getElementById("registerConfirmPassword")?.value;

  if (!email || !pass1) {
    notify("Uzupełnij wymagane pola.", "error");
    return;
  }
  if (pass1 !== pass2) {
    notify("Hasła nie są identyczne!", "error");
    return;
  }

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass1);
    if (name) {
      await updateProfile(user, { displayName: name });
    }
    await setDoc(doc(db, "users", user.uid), {
      name: name || null,
      email,
      createdAt: serverTimestamp(),
      provider: "password",
      emailVerified: user.emailVerified || false
    }, { merge: true });
    try {
      await sendEmailVerification(user);
      notify("Na Twój adres wysłaliśmy wiadomość z linkiem aktywacyjnym. Sprawdź skrzynkę i potwierdź konto.", "info");
    } catch (verificationError) {
      console.error("[register][verification]", verificationError);
    }
  } catch (error) {
    console.error("[register]", error);
    notify(niceAuthError(error), "error");
  }
});

async function signInWithGoogleSmart() {
  const isHttps = location.protocol === "https:";
  if (!isHttps) {
    notify("Uruchom stronę przez https (nie file://).", "error");
    return;
  }
  try {
    await signInWithPopup(auth, googleProvider);
    closeModal(loginModal);
    closeModal(registerModal);
    document.querySelector(".nav-menu")?.classList.remove("active");
    mobileAuthC?.setAttribute("style", "display:none;");
  } catch (error) {
    console.error("[google]", error);
    if (error?.code === "auth/popup-blocked" || error?.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, googleProvider);
    } else {
      notify(niceAuthError(error), "error");
    }
  }
}

[googleBtnRegister, googleBtnLogin].forEach((btn) => {
  btn?.addEventListener("click", (event) => {
    event.preventDefault();
    signInWithGoogleSmart();
  });
});

accountBtn?.addEventListener("click", () => {
  window.location.href = "index.html#userDashboard";
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("[logout]", error);
  }
});

function renderMobileAuth(user) {
  const navMenu = document.querySelector(".nav-menu");
  if (!mobileAuthC) return;

  if (user) {
    const label = user.displayName ? user.displayName.split(" ")[0] : (user.email || "Użytkownik");
    mobileAuthC.innerHTML = `
      <div class="nav-link" style="font-weight:600;">
        <i class="fas fa-user"></i> ${label}
      </div>
      <a href="index.html#userDashboard" class="nav-link" id="mobileAccountLink">Moje konto</a>
      <button class="btn btn-secondary" id="mobileLogoutBtn" style="width:100%;">
        <i class="fas fa-sign-out-alt"></i> Wyloguj się
      </button>
    `;
  } else {
    mobileAuthC.innerHTML = `
      <a href="#" id="loginLink" class="nav-link">Zaloguj się</a>
      <a href="#" id="registerLink" class="nav-link">Zarejestruj się</a>
    `;
  }

  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");
  const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
  const mobileAccountLink = document.getElementById("mobileAccountLink");

  loginLink?.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(loginModal);
    navMenu?.classList.remove("active");
    mobileAuthC.style.display = "none";
  });

  registerLink?.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(registerModal);
    navMenu?.classList.remove("active");
    mobileAuthC.style.display = "none";
  });

  mobileLogoutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("[logout]", error);
    }
    navMenu?.classList.remove("active");
    mobileAuthC.style.display = "none";
  });

  mobileAccountLink?.addEventListener("click", (event) => {
    event.preventDefault();
    navMenu?.classList.remove("active");
    mobileAuthC.style.display = "none";
    window.location.href = "index.html#userDashboard";
  });

  mobileAuthC.style.display = navMenu?.classList.contains("active") ? "flex" : "none";
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    authButtons && (authButtons.style.display = "none");
    userMenu && (userMenu.style.display = "flex");
    if (accountBtn) {
      const label = user.displayName || user.email || "Moje konto";
      accountBtn.innerHTML = `<i class="fas fa-user"></i> ${label}`;
    }
    closeModal(loginModal);
    closeModal(registerModal);
  } else {
    authButtons && (authButtons.style.display = "flex");
    userMenu && (userMenu.style.display = "none");
  }
  renderMobileAuth(user);
});
