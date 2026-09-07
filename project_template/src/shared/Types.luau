--!strict

export type PlayerData = {
	coins: number,
	gems: number,
	jumpMultiplier: number,
	speedMultiplier: number,
	inventory: { string },
	unlockedIslands: { string },
	schemaVersion: number,
	sessionLockTimestamp: number?,
	sessionLockJobId: string?,
}

export type PurchaseRecord = {
	purchaseId: string,
	productId: number,
	timestamp: number,
	granted: boolean,
}

export type TokenBucket = {
	tokens: number,
	lastRefill: number,
	maxTokens: number,
	refillRatePerSec: number,
}

export type IslandBiome = "Grass" | "Desert" | "Ice" | "Volcanic"

export type IslandConfig = {
	name: string,
	biome: IslandBiome,
	radius: number,
	position: Vector3,
}

return {}
