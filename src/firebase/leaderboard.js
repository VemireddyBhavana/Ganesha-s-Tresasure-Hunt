import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

const COLLECTION_NAME = "leaderboard";

/**
 * Save player score to Firebase Firestore and local backup
 */
export async function saveScore(playerName, score, stars = 3, timeLeft = 0) {
  try {
    const localScores = JSON.parse(localStorage.getItem("ganesha_leaderboard_local") || "[]");
    localScores.push({
      playerName: playerName || "Festival Seva Volunteer",
      score,
      stars,
      timeLeft,
      createdAt: new Date().toISOString()
    });
    localScores.sort((a, b) => b.score - a.score);
    localStorage.setItem("ganesha_leaderboard_local", JSON.stringify(localScores.slice(0, 20)));
  } catch (e) {
    console.warn("Local storage save warning:", e);
  }

  if (db && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        playerName: playerName || "Festival Seva Volunteer",
        score,
        stars,
        timeLeft,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Could not save to Firebase Firestore:", e);
    }
  }
}

/**
 * Fetch top scores from Firebase or real local player data
 */
export async function getTopScores(maxCount = 10) {
  if (db && import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("score", "desc"),
        limit(maxCount)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((doc, idx) => ({
          id: doc.id,
          rank: idx + 1,
          ...doc.data()
        }));
      }
    } catch (e) {
      console.warn("Firestore query warning (falling back to local player scores):", e);
    }
  }

  // Real local player data (saved from actual gameplay)
  try {
    const local = JSON.parse(localStorage.getItem("ganesha_leaderboard_local") || "[]");
    local.sort((a, b) => b.score - a.score);
    return local.slice(0, maxCount).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  } catch (e) {
    return [];
  }
}
