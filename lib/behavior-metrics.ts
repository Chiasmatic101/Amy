type GameEvent = {
  event?: string;
  eventTimestamp?: string;
  data?: Record<string, unknown>;
};

export type BehaviorMetrics = {
  decisions: {
    count: number;
    averageDecisionTimeMs: number | null;
    fastestDecisionTimeMs: number | null;
    slowestDecisionTimeMs: number | null;
    decisionTimeStdDevMs: number | null;
  };

  dynamics: {
  decisionTimeTrendMsPerDecision: number | null;
  decisionTimeTrendPercent: number | null;
  decisionTimeCoefficientOfVariation: number | null;

  postErrorDecisionTimeMs: number | null;
  baselineDecisionTimeMs: number | null;
  postErrorSlowingPercent: number | null;

  boosterTimingPercent: number | null;

 failureToAdOfferMs: number | null;
adDecisionTimeMs: number | null;
adExposureTimeMs: number | null;
postAdResumeTimeMs: number | null;
resumeToFirstMoveMs: number | null;
totalFailureInterruptionMs: number | null;
};

  gameplay: {
    moves: number;
    validMoves: number;
    invalidMoves: number;
    invalidMoveRate: number | null;
    levelsStarted: number;
    levelsCompleted: number;
    levelsFailed: number;
    completionRate: number | null;
  };

  strategy: {
    boostersUsed: number;
  };

  advertising: {
    adsOffered: number;
    adsAccepted: number;
    adsCompleted: number;
    adAcceptanceRate: number | null;
  };

  recovery: {
    resumedAfterFailure: boolean;
    completedLevelAfterFailure: boolean;
    completedLevelAfterAd: boolean;
  };
};

export function calculateBehaviorMetrics(
  events: GameEvent[]
): BehaviorMetrics {
  // ---------------------------------------------
  // Decision behaviour
  // ---------------------------------------------

  const decisionTimes = events
    .map((event) => event.data?.decisionTimeMs)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );

  const averageDecisionTimeMs =
    decisionTimes.length > 0
      ? Math.round(
          decisionTimes.reduce((sum, value) => sum + value, 0) /
            decisionTimes.length
        )
      : null;

  const fastestDecisionTimeMs =
    decisionTimes.length > 0
      ? Math.min(...decisionTimes)
      : null;

  const slowestDecisionTimeMs =
    decisionTimes.length > 0
      ? Math.max(...decisionTimes)
      : null;

  let decisionTimeStdDevMs: number | null = null;

  if (
    decisionTimes.length > 1 &&
    averageDecisionTimeMs !== null
  ) {
    const variance =
      decisionTimes.reduce((sum, value) => {
        const difference =
          value - averageDecisionTimeMs;

        return sum + difference * difference;
      }, 0) / decisionTimes.length;

    decisionTimeStdDevMs = Math.round(
      Math.sqrt(variance)
    );
  }

  // ---------------------------------------------
// Behavioural dynamics
// ---------------------------------------------

// Decision-time trend using simple linear regression.
// Positive = decisions became slower.
// Negative = decisions became faster.

let decisionTimeTrendMsPerDecision: number | null = null;
let decisionTimeTrendPercent: number | null = null;

if (decisionTimes.length >= 2) {
  const n = decisionTimes.length;

  const xMean = (n - 1) / 2;

  const yMean =
    decisionTimes.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denominator = 0;

  decisionTimes.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean);
    denominator += (index - xMean) ** 2;
  });

  if (denominator > 0) {
    decisionTimeTrendMsPerDecision =
      Math.round(numerator / denominator);

    if (yMean > 0) {
      decisionTimeTrendPercent =
        decisionTimeTrendMsPerDecision / yMean;
    }
  }
}

// Normalized decision variability

const decisionTimeCoefficientOfVariation =
  averageDecisionTimeMs !== null &&
  averageDecisionTimeMs > 0 &&
  decisionTimeStdDevMs !== null
    ? decisionTimeStdDevMs / averageDecisionTimeMs
    : null;

// ---------------------------------------------
// Post-error behaviour
// ---------------------------------------------


const baselineDecisionTimes: number[] = [];
const postErrorDecisionTimes: number[] = [];

for (let i = 0; i < events.length; i++) {
  const currentEvent = events[i];

  const decisionTime =
    typeof currentEvent.data?.decisionTimeMs === "number"
      ? currentEvent.data.decisionTimeMs
      : null;

  if (decisionTime !== null) {
    const previousEvent = events[i - 1];

    if (previousEvent?.event === "invalid_move") {
      postErrorDecisionTimes.push(decisionTime);
    } else {
      baselineDecisionTimes.push(decisionTime);
    }
  }
}

const mean = (values: number[]) =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) /
      values.length
    : null;

const postErrorDecisionTimeMs =
  mean(postErrorDecisionTimes);

const baselineDecisionTimeMs =
  mean(baselineDecisionTimes);

const postErrorSlowingPercent =
  postErrorDecisionTimeMs !== null &&
  baselineDecisionTimeMs !== null &&
  baselineDecisionTimeMs > 0
    ? (postErrorDecisionTimeMs - baselineDecisionTimeMs) /
      baselineDecisionTimeMs
    : null;

    // ---------------------------------------------
// Booster timing
// ---------------------------------------------

const gameplayEvents = events.filter(
  (event) =>
    event.event === "move_made" ||
    event.event === "invalid_move" ||
    event.event === "booster_used"
);

const boosterIndex = gameplayEvents.findIndex(
  (event) => event.event === "booster_used"
);

const boosterTimingPercent =
  boosterIndex >= 0 && gameplayEvents.length > 1
    ? boosterIndex / (gameplayEvents.length - 1)
    : null;

// ---------------------------------------------
// Failure / ad / recovery timing
// ---------------------------------------------

function eventTime(event: GameEvent | undefined) {
  if (!event?.eventTimestamp) {
    return null;
  }

  const time = new Date(event.eventTimestamp).getTime();

  return Number.isFinite(time) ? time : null;
}

function timeBetween(
  first: GameEvent | undefined,
  second: GameEvent | undefined
) {
  const firstTime = eventTime(first);
  const secondTime = eventTime(second);

  if (firstTime === null || secondTime === null) {
    return null;
  }

  const difference = secondTime - firstTime;

  return difference >= 0 ? difference : null;
}

const failureIndex = events.findIndex(
  (event) => event.event === "level_failed"
);

let failureToAdOfferMs: number | null = null;
let adDecisionTimeMs: number | null = null;
let adExposureTimeMs: number | null = null;
let postAdResumeTimeMs: number | null = null;
let resumeToFirstMoveMs: number | null = null;
let totalFailureInterruptionMs: number | null = null;

if (failureIndex >= 0) {
  const afterFailure = events.slice(failureIndex);

  const failureEvent = events[failureIndex];

  const adOffer = afterFailure.find(
    (event) => event.event === "rewarded_ad_offered"
  );

  const adAccepted = afterFailure.find(
    (event) => event.event === "rewarded_ad_accepted"
  );

  const adCompleted = afterFailure.find(
    (event) => event.event === "ad_completed"
  );

  const gameplayResumed = afterFailure.find(
    (event) => event.event === "gameplay_resumed"
  );

  let firstMoveAfterResume: GameEvent | undefined;

  if (gameplayResumed) {
    const resumeIndex = events.indexOf(gameplayResumed);

    firstMoveAfterResume = events
      .slice(resumeIndex + 1)
      .find(
        (event) =>
          event.event === "move_made" ||
          event.event === "invalid_move"
      );
  }

  failureToAdOfferMs = timeBetween(
    failureEvent,
    adOffer
  );

  adDecisionTimeMs = timeBetween(
    adOffer,
    adAccepted
  );

  adExposureTimeMs = timeBetween(
    adAccepted,
    adCompleted
  );

  postAdResumeTimeMs = timeBetween(
    adCompleted,
    gameplayResumed
  );

  resumeToFirstMoveMs = timeBetween(
    gameplayResumed,
    firstMoveAfterResume
  );

  totalFailureInterruptionMs = timeBetween(
    failureEvent,
    firstMoveAfterResume
  );
}
  // ---------------------------------------------
  // Gameplay
  // ---------------------------------------------

  const moveEvents = events.filter(
    (event) => event.event === "move_made"
  );

  const invalidMoveEvents = events.filter(
    (event) => event.event === "invalid_move"
  );

  const validMoves = moveEvents.filter(
    (event) => event.data?.valid !== false
  ).length;

  const invalidMoves =
    invalidMoveEvents.length +
    moveEvents.filter(
      (event) => event.data?.valid === false
    ).length;

  const totalMoves = validMoves + invalidMoves;

  const invalidMoveRate =
    totalMoves > 0
      ? invalidMoves / totalMoves
      : null;

  const levelsStarted = events.filter(
    (event) => event.event === "level_started"
  ).length;

  const levelsCompleted = events.filter(
    (event) => event.event === "level_completed"
  ).length;

  const levelsFailed = events.filter(
    (event) => event.event === "level_failed"
  ).length;

  const completionRate =
    levelsStarted > 0
      ? levelsCompleted / levelsStarted
      : null;

  // ---------------------------------------------
  // Strategy
  // ---------------------------------------------

  const boostersUsed = events.filter(
    (event) => event.event === "booster_used"
  ).length;

  // ---------------------------------------------
  // Advertising
  // ---------------------------------------------

  const adsOffered = events.filter(
    (event) =>
      event.event === "rewarded_ad_offered"
  ).length;

  const adsAccepted = events.filter(
    (event) =>
      event.event === "rewarded_ad_accepted"
  ).length;

  const adsCompleted = events.filter(
    (event) => event.event === "ad_completed"
  ).length;

  const adAcceptanceRate =
    adsOffered > 0
      ? adsAccepted / adsOffered
      : null;

  // ---------------------------------------------
  // Recovery behaviour
  // ---------------------------------------------

  const adCompletedIndex = events.findIndex(
    (event) => event.event === "ad_completed"
  );

  const resumedAfterFailure =
    failureIndex >= 0 &&
    events
      .slice(failureIndex + 1)
      .some(
        (event) =>
          event.event === "gameplay_resumed"
      );

  const completedLevelAfterFailure =
    failureIndex >= 0 &&
    events
      .slice(failureIndex + 1)
      .some(
        (event) =>
          event.event === "level_completed"
      );

  const completedLevelAfterAd =
    adCompletedIndex >= 0 &&
    events
      .slice(adCompletedIndex + 1)
      .some(
        (event) =>
          event.event === "level_completed"
      );

  return {
    decisions: {
      count: decisionTimes.length,
      averageDecisionTimeMs,
      fastestDecisionTimeMs,
      slowestDecisionTimeMs,
      decisionTimeStdDevMs,
    },

    dynamics: {
  decisionTimeTrendMsPerDecision,
  decisionTimeTrendPercent,
  decisionTimeCoefficientOfVariation,

  postErrorDecisionTimeMs:
    postErrorDecisionTimeMs !== null
      ? Math.round(postErrorDecisionTimeMs)
      : null,

  baselineDecisionTimeMs:
    baselineDecisionTimeMs !== null
      ? Math.round(baselineDecisionTimeMs)
      : null,

  postErrorSlowingPercent,

  boosterTimingPercent,

  failureToAdOfferMs,
adDecisionTimeMs,
adExposureTimeMs,
postAdResumeTimeMs,
resumeToFirstMoveMs,
totalFailureInterruptionMs,
},

    gameplay: {
      moves: totalMoves,
      validMoves,
      invalidMoves,
      invalidMoveRate,
      levelsStarted,
      levelsCompleted,
      levelsFailed,
      completionRate,
    },

    strategy: {
      boostersUsed,
    },

    advertising: {
      adsOffered,
      adsAccepted,
      adsCompleted,
      adAcceptanceRate,
    },

    recovery: {
      resumedAfterFailure,
      completedLevelAfterFailure,
      completedLevelAfterAd,
    },
  };
}