const remoteQueries = new Map();

export function registerRemoteQueries({gm, user}) {
    for(const [scope, handlers] of Object.entries({gm, user})) {
        for(const [name, handler] of Object.entries(handlers)) {
            if(typeof handler !== "function") throw new Error(`Invalid GPS query handler: ${name}`);
            const queryName = `gambits-premades.${name}`;
            const execute = data => {
                if(scope === "gm" && !game.user.isGM) throw new Error(`GPS query requires a GM: ${name}`);
                return handler(data);
            };
            remoteQueries.set(name, {queryName, execute, gmOnly: scope === "gm"});
            CONFIG.queries[queryName] = execute;
        }
    }
}

export async function queryUser(name, userId, data) {
    const query = remoteQueries.get(name);
    if(!query) throw new Error(`Unknown GPS query: ${name}`);
    const user = game.users.get(userId);
    if(!user?.active) throw new Error(`GPS query recipient is not connected: ${userId}`);
    if(query.gmOnly && !user.isGM) throw new Error(`GPS query requires a GM: ${name}`);
    if(user.isSelf) return query.execute(data);
    let disconnected;
    try {
        const disconnect = new Promise((resolve, reject) => {
            disconnected = Hooks.on("userConnected", (changedUser, connected) => {
                if(changedUser.id === user.id && !connected) reject(new Error(`GPS query recipient disconnected: ${userId}`));
            });
        });
        return await Promise.race([user.query(query.queryName, data), disconnect]);
    } finally {
        if(disconnected !== undefined) Hooks.off("userConnected", disconnected);
    }
}

export async function queryGM(name, data) {
    let user = game.user;
    if(!user.isGM) {
        const preferred = game.users.get(game.gps.getPrimaryGM());
        user = preferred?.active && preferred.isGM ? preferred : game.users.activeGM;
    }
    if(!user?.active || !user.isGM) throw new Error(`GPS query requires a connected GM: ${name}`);
    return queryUser(name, user.id, data);
}
