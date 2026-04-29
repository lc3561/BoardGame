import type { PlayerId } from '../types';

type SeatControllerLike = { type?: unknown } | undefined;
type SetupSeatControllers = Record<string, SeatControllerLike>;

function isAiSeatType(type: unknown): boolean {
    return type === 'local-ai' || type === 'remote-ai';
}

function hasExplicitInitialOrder(setupData: unknown): boolean {
    if (!setupData || typeof setupData !== 'object' || Array.isArray(setupData)) {
        return false;
    }

    const record = setupData as {
        turnOrder?: unknown;
        firstPlayerId?: unknown;
    };

    if (Array.isArray(record.turnOrder) && record.turnOrder.length > 0) {
        return true;
    }

    return typeof record.firstPlayerId === 'string' && record.firstPlayerId.length > 0;
}

function extractSetupSeatControllers(setupData: unknown): SetupSeatControllers | undefined {
    if (!setupData || typeof setupData !== 'object' || Array.isArray(setupData)) {
        return undefined;
    }

    const rawSeatControllers = (setupData as { seatControllers?: unknown }).seatControllers;
    if (!rawSeatControllers || typeof rawSeatControllers !== 'object' || Array.isArray(rawSeatControllers)) {
        return undefined;
    }

    return rawSeatControllers as SetupSeatControllers;
}

export function resolveSetupPlayerIds(args: {
    playerIds: PlayerId[];
    setupData?: unknown;
    seatControllers?: SetupSeatControllers;
}): PlayerId[] {
    const { playerIds, setupData } = args;
    if (playerIds.length <= 1) {
        return playerIds;
    }

    if (hasExplicitInitialOrder(setupData)) {
        return playerIds;
    }

    const seatControllers = args.seatControllers ?? extractSetupSeatControllers(setupData);
    if (!seatControllers) {
        return playerIds;
    }

    const hasAiSeat = playerIds.some((playerId) => isAiSeatType(seatControllers[playerId]?.type));
    const hasHumanSeat = playerIds.some((playerId) => !isAiSeatType(seatControllers[playerId]?.type));
    if (!hasAiSeat || !hasHumanSeat) {
        return playerIds;
    }

    const firstHumanIndex = playerIds.findIndex(
        (playerId) => !isAiSeatType(seatControllers[playerId]?.type),
    );
    if (firstHumanIndex <= 0) {
        return playerIds;
    }

    return [
        ...playerIds.slice(firstHumanIndex),
        ...playerIds.slice(0, firstHumanIndex),
    ];
}

