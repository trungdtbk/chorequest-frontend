import { useState, useEffect, useRef } from "react";
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

// ── Pixel font via Google Fonts (loaded inline) ──────────────────────────────
const FONT_LINK = `@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@600;800&display=swap');`;

// ── Game Data ─────────────────────────────────────────────────────────────────
const STAT_COSTS = { hp: 10, attack: 15, defense: 12, speed: 10 };
const STAT_LABELS = { hp: "❤️ HP", attack: "⚔️ Attack", defense: "🛡 Defense", speed: "⚡ Speed" };
const BASE_PLAYER = { hp: 80, attack: 18, defense: 10, speed: 12 };

const OPPONENTS = [
  { id: 1, name: "Dusty Broom", emoji: "🧹", tier: "Easy",   color: "#7ecba1", hp: 60,  attack: 12, defense: 6,  speed: 8,  reward: 30,  desc: "A cursed broom from the junk drawer." },
  { id: 2, name: "Trash Goblin", emoji: "🗑️", tier: "Easy",   color: "#a3c4f3", hp: 75,  attack: 15, defense: 9,  speed: 11, reward: 45,  desc: "Smells like last week's dinner." },
  { id: 3, name: "Sock Monster", emoji: "🧦", tier: "Medium", color: "#f9c74f", hp: 95,  attack: 20, defense: 14, speed: 14, reward: 65,  desc: "Lives under the bed. Very angry." },
  { id: 4, name: "Laundry Beast", emoji: "👕", tier: "Medium", color: "#f8961e", hp: 110, attack: 25, defense: 18, speed: 10, reward: 85,  desc: "An ancient pile that gained sentience." },
  { id: 5, name: "Mega Mess",    emoji: "💥", tier: "Hard",   color: "#f3722c", hp: 140, attack: 32, defense: 22, speed: 18, reward: 120, desc: "The final form of a chaotic room." },
  { id: 6, name: "Chore Dragon", emoji: "🐉", tier: "Boss",   color: "#e63946", hp: 180, attack: 40, defense: 30, speed: 22, reward: 200, desc: "Destroyer of tidy rooms everywhere." },
];

// ── Battle Engine ─────────────────────────────────────────────────────────────
function simulateBattle(player, opponent) {
  let pHP = player.hp, oHP = opponent.hp;
  const log = [];
  let round = 0;

  while (pHP > 0 && oHP > 0 && round < 50) {
    round++;
    // Determine order by speed
    const playerFirst = player.speed >= opponent.speed;
    const turns = playerFirst
      ? [["player", "opponent"], ["opponent", "player"]]
      : [["opponent", "player"], ["player", "opponent"]];

    for (const [attacker, defender] of turns) {
      if (pHP <= 0 || oHP <= 0) break;
      const atk = attacker === "player" ? player : opponent;
      const def = attacker === "player" ? opponent : player;
      const defHP = attacker === "player" ? oHP : pHP;

      const crit = Math.random() < 0.15;
      const miss = Math.random() < 0.08;
      let dmg = 0;

      if (miss) {
        log.push({ round, attacker, type: "miss", text: attacker === "player" ? `You swing and miss!` : `${opponent.name} misses!` });
      } else {
        dmg = Math.max(1, atk.attack - def.defense + Math.floor(Math.random() * 6) - 2);
        if (crit) dmg = Math.floor(dmg * 1.8);
        if (attacker === "player") oHP -= dmg;
        else pHP -= dmg;
        log.push({
          round, attacker, type: crit ? "crit" : "hit", dmg,
          pHP: Math.max(0, pHP), oHP: Math.max(0, oHP),
          text: attacker === "player"
            ? `${crit ? "💥 CRIT! " : ""}You deal ${dmg} damage! (Opp: ${Math.max(0, oHP)} HP)`
            : `${crit ? "💥 CRIT! " : ""}${opponent.name} deals ${dmg} damage! (You: ${Math.max(0, pHP)} HP)`,
        });
      }
    }
  }

  const won = pHP > 0;
  log.push({ round: round + 1, attacker: "system", type: "end", text: won ? `🏆 Victory! You defeated ${opponent.name}!` : `💀 Defeat... ${opponent.name} wins this round.` });
  return { won, log, finalPHP: Math.max(0, pHP), finalOHP: Math.max(0, oHP) };
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const HPBar = ({ current, max, color = "#e63946" }) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = pct > 60 ? "#57cc99" : pct > 30 ? "#f9c74f" : "#e63946";
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 4, height: 14, width: "100%", border: "2px solid #444", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 0.4s ease", borderRadius: 2 }} />
    </div>
  );
};

const StatRow = ({ label, value, cost, xp, onUpgrade, disabled }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #2a2a4a" }}>
    <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, color: "#c8c8ff", minWidth: 110, fontSize: 13 }}>{label}</span>
    <span style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: "#fff", minWidth: 28 }}>{value}</span>
    <button
      onClick={onUpgrade}
      disabled={disabled}
      style={{
        marginLeft: "auto", fontFamily: "'Press Start 2P'", fontSize: 8,
        padding: "5px 8px", borderRadius: 4, border: "2px solid",
        borderColor: !disabled ? "#f9c74f" : "#444",
        background: !disabled ? "#2a2030" : "#1a1a1a",
        color: !disabled ? "#f9c74f" : "#555",
        cursor: !disabled ? "pointer" : "not-allowed",
        transition: "all 0.15s",
      }}
    >+1 ({cost} XP)</button>
  </div>
);

const getInitialStats = (user) => {
  const pet = user?.avatar_config?.pet;
  const petPowers = user?.avatar_config?.pet_powers;
  const avatarStats = pet && petPowers?.[pet];
  if (!avatarStats || typeof avatarStats !== 'object') {
    return { ...BASE_PLAYER };
  }

  return {
    hp: Number(avatarStats.hp ?? BASE_PLAYER.hp),
    attack: Number(avatarStats.attack ?? BASE_PLAYER.attack),
    defense: Number(avatarStats.defense ?? BASE_PLAYER.defense),
    speed: Number(avatarStats.speed ?? BASE_PLAYER.speed),
  };
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ChoreQuestBattler() {
    const { user, updateUser } = useAuth();
    const [xp, setXp] = useState(() => Number(user?.points_balance ?? 0));
    const [stats, setStats] = useState(() => getInitialStats(user));
    const [rewards, setRewards] = useState([]);
    const [screen, setScreen] = useState("hub"); // hub | train | pick | battle | result
    const [selectedOpponent, setSelectedOpponent] = useState(null);
    const [battleResult, setBattleResult] = useState(null);
    const [battleLog, setBattleLog] = useState([]);
    const [logIndex, setLogIndex] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [playerAnim, setPlayerAnim] = useState("");
    const [oppAnim, setOppAnim] = useState("");
    const logRef = useRef(null);

  useEffect(() => {
    if (user) {
      setStats(getInitialStats(user));
    }
  }, [user]);

  // Animate battle log playback
  useEffect(() => {
    if (screen !== "battle" || !battleResult) return;
    if (logIndex >= battleResult.log.length) { setAnimating(false); return; }
    setAnimating(true);
    const entry = battleResult.log[logIndex];
    if (entry.type !== "end") {
      if (entry.attacker === "player") setPlayerAnim("shake");
      else setOppAnim("shake");
      setTimeout(() => { setPlayerAnim(""); setOppAnim(""); }, 300);
    }
    const delay = entry.type === "end" ? 600 : 500;
    const t = setTimeout(() => {
      setBattleLog(prev => [...prev, entry]);
      setLogIndex(i => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [screen, logIndex, battleResult]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);



  useEffect(() => {
    let cancelled = false;

    const loadRewards = async () => {
      try {
        const data = await api('/api/rewards');
        if (!cancelled) {
          setRewards(data ?? []);
        }
      } catch (err) {
        console.error('Failed to load rewards:', err);
      }
    };

    loadRewards();
    return () => { cancelled = true; };
  }, []);

  const statRewardMap = {
    hp: rewards.find(reward => reward.category === 'pet_power_hp'),
    attack: rewards.find(reward => reward.category === 'pet_power_attack'),
    defense: rewards.find(reward => reward.category === 'pet_power_defense'),
    speed: rewards.find(reward => reward.category === 'pet_power_speed'),
  };

  const upgrade = async (stat) => {
    const reward = statRewardMap[stat];
    if (!reward) return;

    const cost = reward.point_cost;
    if (xp < cost) return;

    const currentPet = user?.avatar_config?.pet;
    if (!currentPet) return;

    const currentAvatarConfig = user?.avatar_config ?? {};
    const currentPetPowers = currentAvatarConfig.pet_powers ?? {};
    const currentStats = currentPetPowers[currentPet] ?? {};
    const updatedStatValue = Number(currentStats[stat] ?? stats[stat] ?? BASE_PLAYER[stat]) + (stat === "hp" ? 10 : 2);

    const updatedAvatarConfig = {
      ...currentAvatarConfig,
      pet_powers: {
        ...currentPetPowers,
        [currentPet]: {
          ...currentStats,
          [stat]: updatedStatValue,
        },
      },
    };

    try {
      await api('/api/avatar', { method: 'PUT', body: { "config": updatedAvatarConfig} });
      await api(`/api/rewards/${reward.id}/redeem`, { method: 'POST' });
      setXp(x => x - cost);
      setStats(s => ({ ...s, [stat]: s[stat] + (stat === 'hp' ? 10 : 2) }));
      updateUser?.({ avatar_config: updatedAvatarConfig });
    } catch (err) {
      console.error('Upgrade failed:', err);
    }
  };

  const startBattle = (opp) => {
    setSelectedOpponent(opp);
    const result = simulateBattle(stats, opp);
    setBattleResult(result);
    setBattleLog([]);
    setLogIndex(0);
    setScreen("battle");
  };

  const claimReward = () => {
    if (battleResult?.won) setXp(x => x + selectedOpponent.reward);
    setScreen("hub");
    setBattleResult(null);
    setBattleLog([]);
  };

  const currentOppHP = battleLog.length > 0
    ? (battleLog[battleLog.length - 1].oHP ?? selectedOpponent?.hp)
    : selectedOpponent?.hp;
  const currentPHP = battleLog.length > 0
    ? (battleLog[battleLog.length - 1].pHP ?? stats.hp)
    : stats.hp;
  const battleDone = battleResult && logIndex >= battleResult.log.length;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    root: {
      fontFamily: "'Press Start 2P', monospace",
      background: "linear-gradient(160deg,#0d0d1f 0%,#1a0d2e 60%,#0d1f2e 100%)",
      minHeight: "100vh", color: "#fff", padding: 20,
      display: "flex", flexDirection: "column", alignItems: "center",
    },
    card: {
      background: "rgba(255,255,255,0.04)", border: "2px solid #2a2a5a",
      borderRadius: 12, padding: 20, width: "100%", maxWidth: 480,
      backdropFilter: "blur(4px)",
    },
    btn: (color = "#f9c74f", bg = "#2a2030") => ({
      fontFamily: "'Press Start 2P'", fontSize: 10, padding: "12px 18px",
      border: `2px solid ${color}`, borderRadius: 6, background: bg,
      color: color, cursor: "pointer", transition: "all 0.15s",
    }),
    header: { fontSize: 11, color: "#a0a0cc", marginBottom: 4, letterSpacing: 1 },
    bigNum: { fontFamily: "'Press Start 2P'", fontSize: 22, color: "#f9c74f" },
    shake: { animation: "shake 0.3s" },
  };

  // ── Screens ──────────────────────────────────────────────────────────────────

  // HUB
  if (screen === "hub") return (
    <div style={S.root}>
      <style>{`
        ${FONT_LINK}
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        * { box-sizing: border-box; }
        button:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.2); }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: "#7070aa", letterSpacing: 3, marginBottom: 6 }}>CHOREQUEST</div>
        <div style={{ fontSize: 18, color: "#f9c74f", textShadow: "0 0 20px #f9c74f88", lineHeight: 1.4 }}>
          BATTLE<br/>ARENA
        </div>
      </div>

      {/* XP Badge */}
      <div style={{ ...S.card, textAlign: "center", marginBottom: 16, borderColor: "#f9c74f44" }}>
        <div style={S.header}>YOUR XP BALANCE</div>
        <div style={S.bigNum}>⭐ {xp} XP</div>
        <div style={{ fontSize: 7, color: "#666", marginTop: 6 }}>earned from completing chores</div>
      </div>

      {/* Hero Preview */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.header}>YOUR HERO</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 52, animation: "float 3s ease-in-out infinite" }}>🧒</div>
          <div style={{ flex: 1 }}>
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 8, marginBottom: 5, color: "#c8c8ff" }}>
                <span>{STAT_LABELS[k]}</span>
                <span style={{ color: "#fff" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 480 }}>
        <button style={{ ...S.btn("#57cc99"), flex: 1 }} onClick={() => setScreen("train")}>
          ⚔️ TRAIN
        </button>
        <button style={{ ...S.btn("#f9c74f"), flex: 1 }} onClick={() => setScreen("pick")}>
          🏟️ BATTLE
        </button>
      </div>
    </div>
  );

  // TRAIN
  if (screen === "train") return (
    <div style={S.root}>
      <style>{`${FONT_LINK} *{box-sizing:border-box} button:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.2)}`}</style>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <button style={{ ...S.btn("#aaa", "transparent"), marginBottom: 16, fontSize: 8 }} onClick={() => setScreen("hub")}>← BACK</button>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: "#57cc99", textShadow: "0 0 15px #57cc9966" }}>TRAINING ROOM</div>
          <div style={{ fontSize: 8, color: "#888", marginTop: 6 }}>spend xp to power up your hero</div>
        </div>

        <div style={{ ...S.card, marginBottom: 16, textAlign: "center", borderColor: "#f9c74f44" }}>
          <div style={{ fontSize: 9, color: "#a0a0cc" }}>AVAILABLE XP</div>
          <div style={S.bigNum}>⭐ {xp}</div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 8, color: "#888", marginBottom: 12 }}>UPGRADES (+1 stat per purchase)</div>
          {Object.entries(STAT_COSTS).map(([stat, baseCost]) => {
            const reward = statRewardMap[stat];
            const cost = reward?.point_cost ?? baseCost;
            const disabled = !reward || xp < cost;
            return (
              <StatRow key={stat}
                label={STAT_LABELS[stat]}
                value={stats[stat]}
                cost={cost}
                xp={xp}
                disabled={disabled}
                onUpgrade={() => upgrade(stat)}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 16, fontSize: 7, color: "#555", textAlign: "center" }}>
          HP upgrades grant +10 • other stats grant +2
        </div>
      </div>
    </div>
  );

  // PICK OPPONENT
  if (screen === "pick") return (
    <div style={S.root}>
      <style>{`${FONT_LINK} *{box-sizing:border-box} button:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.15)}`}</style>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <button style={{ ...S.btn("#aaa", "transparent"), marginBottom: 16, fontSize: 8 }} onClick={() => setScreen("hub")}>← BACK</button>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#f9c74f", textShadow: "0 0 15px #f9c74f66" }}>CHOOSE OPPONENT</div>
        </div>

        {OPPONENTS.map(opp => (
          <div key={opp.id} style={{
            ...S.card, marginBottom: 12, cursor: "pointer",
            borderColor: opp.color + "66",
            transition: "all 0.2s",
          }}
            onClick={() => startBattle(opp)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 40 }}>{opp.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#fff", marginBottom: 4 }}>{opp.name}</div>
                <div style={{ fontSize: 7, color: "#999", marginBottom: 6 }}>{opp.desc}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 7, color: "#c8c8ff" }}>
                  <span>❤️ {opp.hp}</span>
                  <span>⚔️ {opp.attack}</span>
                  <span>🛡 {opp.defense}</span>
                  <span>⚡ {opp.speed}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 7, padding: "3px 7px", borderRadius: 4,
                  background: opp.color + "33", border: `1px solid ${opp.color}`,
                  color: opp.color, marginBottom: 6
                }}>{opp.tier}</div>
                <div style={{ fontSize: 8, color: "#f9c74f" }}>+{opp.reward} XP</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // BATTLE
  if (screen === "battle" && selectedOpponent) return (
    <div style={S.root}>
      <style>{`
        ${FONT_LINK}
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", fontSize: 9, color: "#888", marginBottom: 16 }}>
          ⚔️ AUTO BATTLE ⚔️
        </div>

        {/* Arena */}
        <div style={{ ...S.card, marginBottom: 12, background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>

            {/* Player */}
            <div style={{ textAlign: "center", width: "40%", animation: playerAnim === "shake" ? "shake 0.3s" : "float 3s ease-in-out infinite" }}>
              <div style={{ fontSize: 52 }}>🧒</div>
              <div style={{ fontSize: 8, color: "#57cc99", marginBottom: 4 }}>YOU</div>
              <div style={{ fontSize: 8, color: "#fff", marginBottom: 6 }}>{Math.max(0, currentPHP)} / {stats.hp}</div>
              <HPBar current={currentPHP} max={stats.hp} />
            </div>

            <div style={{ fontSize: 20, color: "#f9c74f", animation: "pulse 1s infinite" }}>VS</div>

            {/* Opponent */}
            <div style={{ textAlign: "center", width: "40%", animation: oppAnim === "shake" ? "shake 0.3s" : "float 3s ease-in-out infinite" }}>
              <div style={{ fontSize: 52 }}>{selectedOpponent.emoji}</div>
              <div style={{ fontSize: 8, color: "#f3722c", marginBottom: 4 }}>{selectedOpponent.name}</div>
              <div style={{ fontSize: 8, color: "#fff", marginBottom: 6 }}>{Math.max(0, currentOppHP ?? selectedOpponent.hp)} / {selectedOpponent.hp}</div>
              <HPBar current={currentOppHP ?? selectedOpponent.hp} max={selectedOpponent.hp} />
            </div>
          </div>
        </div>

        {/* Battle Log */}
        <div ref={logRef} style={{
          ...S.card, height: 200, overflowY: "auto", marginBottom: 12,
          background: "#050510", borderColor: "#1a1a3a",
        }}>
          {battleLog.length === 0 && (
            <div style={{ fontSize: 8, color: "#555", textAlign: "center", marginTop: 80, animation: "pulse 1s infinite" }}>
              battle loading...
            </div>
          )}
          {battleLog.map((entry, i) => (
            <div key={i} style={{
              fontSize: 8, marginBottom: 8,
              color: entry.type === "end" ? "#f9c74f"
                : entry.attacker === "player" ? "#57cc99"
                : entry.attacker === "opponent" ? "#f3722c"
                : "#aaa",
              paddingLeft: 4,
              borderLeft: `2px solid ${entry.type === "end" ? "#f9c74f" : entry.attacker === "player" ? "#57cc9955" : "#f3722c55"}`,
            }}>
              {entry.type === "crit" && <span style={{ color: "#f9c74f" }}>★ </span>}
              {entry.text}
            </div>
          ))}
        </div>

        {battleDone && (
          <button
            style={{ ...S.btn(battleResult.won ? "#57cc99" : "#e63946"), width: "100%", fontSize: 11 }}
            onClick={claimReward}
          >
            {battleResult.won
              ? `🏆 CLAIM +${selectedOpponent.reward} XP`
              : "💀 TRY AGAIN"}
          </button>
        )}

        {!battleDone && (
          <div style={{ textAlign: "center", fontSize: 7, color: "#555", animation: "pulse 1s infinite" }}>
            battle in progress...
          </div>
        )}
      </div>
    </div>
  );

  return null;
}
