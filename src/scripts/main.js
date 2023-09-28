import * as Mc from '@minecraft/server';
import * as VectorMath from './lib/vectorMath';

/**
 * Object containing players that need protection. Keys are player IDs.
 * @typedef {Object.<string, ProtectedPlayer>} ProtectedPlayers
 */

/**
 * Information about protected player.
 * @typedef {Object} ProtectedPlayer
 * @prop {Mc.Player} player The player object.
 * @prop {Object} original Original data when the player has (re)spawned.
 * @prop {Object} initialSpawn `true` if the spawn is after joining a world.
 * @prop {number} original.tick Tick when the player has spawned.
 * @prop {Mc.Vector3} original.location Location where the player has spawned.
 * @prop {Mc.Vector3} original.viewDirection Direction the player was looking when spawned.
 */

/**
 * @type {ProtectedPlayers}
 */
const protectedPlayers = {};

//# Spawn Protection Worker
Mc.system.runInterval(() => {
    for (const playerId in protectedPlayers) {
        const { original, player, initialSpawn } = protectedPlayers[playerId];
        const invincibilityTimer = initialSpawn ? 80 : 60

        if (
            (Mc.system.currentTick - original.tick) > invincibilityTimer &&
            (
                !VectorMath.compare(player.location,original.location) ||
                !VectorMath.compare(player.getViewDirection(),original.viewDirection) ||
                player.isSneaking ||
                player.isEmoting ||
                player.isJumping
            )
        ) {
            delete protectedPlayers[playerId];
        }

        protectPlayer(player, 20);
    }
},4);

//# Spawn Protection Trigger
Mc.world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;

    Mc.system.runTimeout(() => {
        protectedPlayers[player.id] = {
            player,
            original: {
                tick: Mc.system.currentTick,
                location: player.location,
                viewDirection: player.getViewDirection()
            },
            initialSpawn: event.initialSpawn
        }
    },4);

    protectPlayer(player, event.initialSpawn ? 60 : 40);
});

/**
 * Protects a player from dying.
 * @param {Mc.Player} player Player to be protected.
 * @param {number} effectDuration Duration the protective effects should last.
 */
function protectPlayer(player, effectDuration) {
    player.addEffect('resistance',effectDuration,{amplifier:99,showParticles:false});
    player.addEffect('invisibility',effectDuration,{amplifier:99,showParticles:false});
    player.addEffect('fire_resistance',effectDuration,{amplifier:99,showParticles:false});

    const entitiesAround = player.dimension.getEntities({
        location: player.location,
        families: ['mob'],
        excludeFamilies: ['inanimate'],
        maxDistance: 3,
        minDistance: 0,
    });
    for (const entity of entitiesAround) { 
        entity.applyImpulse(VectorMath.sub(entity.location,player.location));
    }
}