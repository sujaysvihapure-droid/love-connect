self.addEventListener("push", (event) => {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (error) {
        data = {
            title: "Love Connect ❤️",
            body: event.data
                ? event.data.text()
                : "Someone is thinking of you ❤️"
        };
    }

    const title =
        data.title || "Love Connect ❤️";

    const options = {
        body:
            data.body ||
            "Someone is thinking of you ❤️",

        icon: "/icon-192.png",

        badge: "/icon-192.png",

        vibrate: [
            200,
            100,
            200
        ],

        data: {
            url: "/"
        }
    };

    event.waitUntil(
        self.registration.showNotification(
            title,
            options
        )
    );
});


self.addEventListener(
    "notificationclick",
    (event) => {

        event.notification.close();

        event.waitUntil(
            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            }).then((clientList) => {

                for (const client of clientList) {

                    if ("focus" in client) {
                        return client.focus();
                    }

                }

                if (clients.openWindow) {
                    return clients.openWindow("/");
                }

            })
        );

    }
);