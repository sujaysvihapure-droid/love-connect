const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    maxHttpBufferSize: 2 * 1024 * 1024
});

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/* =====================================================
   CONFIG
===================================================== */

const ANNIVERSARY_DATE = "25/12/2019";

const COUPLE_ROOM = "private-couple-room-01";

const PORT = process.env.PORT || 3000;


/* =====================================================
   GLOBAL
===================================================== */

let kissCount = 0;


/* =====================================================
   SURPRISE MESSAGES
===================================================== */

const surpriseMessages = [
    "💌 I was just thinking about you ❤️",
    "🥺 I miss you a little extra today...",
    "💕 You are my favorite person.",
    "🫂 Wish I could hug you right now.",
    "😘 Sending you a random kiss!",
    "❤️ You mean more to me than you know.",
    "🥰 Just a little reminder that I love you.",
    "💗 Somewhere between everything, I'm thinking of you.",
    "😚 One surprise kiss just for you.",
    "🌸 You make my ordinary days feel special.",
    "🫶 I'm lucky to have you.",
    "💞 No reason... just wanted to make you smile."
];


/* =====================================================
   🎯 COUPLE QUESTIONS
===================================================== */

const coupleQuestions = [
    "Who fell first? ❤️",
    "Who says sorry first? 🥺",
    "Who misses whom more? 🫂",
    "Who is more romantic? 💕",
    "Who gets jealous first? 😏",
    "Who loves late-night talks more? 🌙",
    "Who would plan the perfect date? 🌹",
    "Who gives better hugs? 🫂",
    "Who is more likely to say 'I love you' first? ❤️",
    "Who makes the other smile more? 😊"
];


/* =====================================================
   🎯 COUPLE QUESTION GAME STATE
===================================================== */

let coupleGame = {

    roundId: 0,

    players: new Set(),

    order: [],

    position: 0,

    activeQuestion: null,

    answers: new Map(),

    results: [],

    revealed: false,

    completed: false,

    nextLocked: false

};


/* =====================================================
   GET CONNECTED COUPLE USERS
===================================================== */

function getCoupleSockets() {

    return [
        ...io.sockets.sockets.values()
    ].filter(
        (client) =>
            client.roomCode === COUPLE_ROOM
    );

}


/* =====================================================
   SHUFFLE
===================================================== */

function shuffle(array) {

    const result = [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            result[i],
            result[j]
        ] = [
                result[j],
                result[i]
            ];

    }

    return result;

}


/* =====================================================
   RESET COUPLE GAME
===================================================== */

function resetCoupleGame() {

    coupleGame = {

        roundId:
            coupleGame.roundId + 1,

        players:
            new Set(),

        order:
            shuffle(
                coupleQuestions.map(
                    (_, index) => index
                )
            ),

        position:
            0,

        activeQuestion:
            null,

        answers:
            new Map(),

        results:
            [],

        revealed:
            false,

        completed:
            false,

        nextLocked:
            false

    };

}


/* =====================================================
   CREATE NEW ROUND
===================================================== */

function startNewCoupleRound(players) {

    coupleGame = {

        roundId:
            coupleGame.roundId + 1,

        players:
            new Set(
                players.map(
                    (socket) =>
                        socket.id
                )
            ),

        order:
            shuffle(
                coupleQuestions.map(
                    (_, index) => index
                )
            ),

        position:
            0,

        activeQuestion:
            null,

        answers:
            new Map(),

        results:
            [],

        revealed:
            false,

        completed:
            false,

        nextLocked:
            false

    };


    console.log(
        `🎯 New Couple Question Round #${coupleGame.roundId}`
    );

}


/* =====================================================
   CREATE QUESTION
===================================================== */

function createQuestion() {

    if (
        coupleGame.position >=
        coupleQuestions.length
    ) {

        return null;

    }


    const questionIndex =
        coupleGame.order[
        coupleGame.position
        ];


    const question =
        coupleQuestions[
        questionIndex
        ];


    coupleGame.activeQuestion = {

        roundId:
            coupleGame.roundId,

        questionNumber:
            coupleGame.position + 1,

        totalQuestions:
            coupleQuestions.length,

        question:
            question

    };


    coupleGame.answers =
        new Map();

    coupleGame.revealed =
        false;

    coupleGame.nextLocked =
        false;


    console.log(
        `🎯 Q${coupleGame.position + 1}/${coupleQuestions.length}: ${question}`
    );


    return coupleGame.activeQuestion;

}


/* =====================================================
   BROADCAST QUESTION
===================================================== */

function broadcastQuestion() {

    if (
        !coupleGame.activeQuestion
    ) {

        return;

    }


    io
        .to(COUPLE_ROOM)
        .emit(
            "couple-question",
            coupleGame.activeQuestion
        );

}


/* =====================================================
   FINAL RESULT
===================================================== */

function completeCoupleRound() {

    if (
        coupleGame.completed
    ) {

        return;

    }


    const sameCount =
        coupleGame.results.filter(
            (result) =>
                result.sameAnswer === true
        ).length;


    const differentCount =
        coupleGame.results.length -
        sameCount;


    coupleGame.completed =
        true;

    coupleGame.activeQuestion =
        null;

    coupleGame.answers =
        new Map();


    console.log(
        `🎉 Round #${coupleGame.roundId} completed`
    );


    io
        .to(COUPLE_ROOM)
        .emit(
            "couple-question-complete",
            {

                roundId:
                    coupleGame.roundId,

                totalQuestions:
                    coupleQuestions.length,

                sameCount:
                    sameCount,

                differentCount:
                    differentCount,

                results:
                    coupleGame.results

            }
        );

}


/* =====================================================
   CONNECTION
===================================================== */

io.on(
    "connection",
    (socket) => {

        console.log(
            "💗 Device connected:",
            socket.id
        );


        /* =================================================
           CHECK DATE
        ================================================= */

        socket.on(
            "check-date",
            (enteredDate) => {

                if (
                    enteredDate !==
                    ANNIVERSARY_DATE
                ) {

                    console.log(
                        "❌ Incorrect anniversary date"
                    );

                    socket.emit(
                        "date-wrong"
                    );

                    return;

                }


                console.log(
                    "❤️ Correct anniversary date:",
                    socket.id
                );


                socket.emit(
                    "date-correct"
                );

            }
        );


        /* =================================================
           SET GENDER
        ================================================= */

        socket.on(
            "set-gender",
            (gender) => {

                if (
                    gender !== "boy" &&
                    gender !== "girl"
                ) {

                    console.log(
                        "⚠️ Invalid gender selection"
                    );

                    return;

                }


                socket.gender =
                    gender;


                socket.join(
                    COUPLE_ROOM
                );


                socket.roomCode =
                    COUPLE_ROOM;


                console.log(
                    `👤 ${socket.id} joined as ${gender}`
                );


                socket.emit(
                    "gender-set",
                    {
                        gender:
                            gender
                    }
                );

            }
        );


        /* =================================================
           ❤️ NORMAL LOVE
        ================================================= */

        socket.on(
            "send-love",
            (data) => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                if (!data) {

                    return;

                }


                console.log(
                    `❤️ ${data.type}: ${data.message}`
                );


                socket
                    .to(COUPLE_ROOM)
                    .emit(
                        "receive-love",
                        data
                    );

            }
        );


        /* =================================================
           🎲 SURPRISE LOVE
        ================================================= */

        socket.on(
            "surprise-love",
            () => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                const randomIndex =
                    Math.floor(
                        Math.random() *
                        surpriseMessages.length
                    );


                const randomMessage =
                    surpriseMessages[
                    randomIndex
                    ];


                console.log(
                    `🎲 Surprise: ${randomMessage}`
                );


                socket
                    .to(COUPLE_ROOM)
                    .emit(
                        "receive-surprise",
                        {
                            message:
                                randomMessage
                        }
                    );

            }
        );


        /* =================================================
           😤 ANGRY
        ================================================= */

        socket.on(
            "angry-mode",
            () => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                console.log(
                    `😤 Angry mode from ${socket.id}`
                );


                socket
                    .to(COUPLE_ROOM)
                    .emit(
                        "receive-angry",
                        {
                            angrySenderId:
                                socket.id,

                            angryMessage:
                                "🚨 Someone is angry with you! 😤"
                        }
                    );

            }
        );


        /* =================================================
           🥺 SORRY
        ================================================= */

        socket.on(
            "sorry-baby",
            (angrySenderId) => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                if (!angrySenderId) {

                    return;

                }


                const angrySocket =
                    io.sockets.sockets.get(
                        angrySenderId
                    );


                if (
                    !angrySocket ||
                    angrySocket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                io
                    .to(angrySenderId)
                    .emit(
                        "receive-sorry",
                        {
                            forgivenReceiverId:
                                socket.id
                        }
                    );


                socket.emit(
                    "sorry-sent"
                );

            }
        );


        /* =================================================
           🥺 FORGIVEN
        ================================================= */

        socket.on(
            "send-forgiven",
            (sorrySenderId) => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                if (!sorrySenderId) {

                    return;

                }


                const sorrySocket =
                    io.sockets.sockets.get(
                        sorrySenderId
                    );


                if (
                    !sorrySocket ||
                    sorrySocket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                io
                    .to(sorrySenderId)
                    .emit(
                        "receive-forgiven"
                    );

            }
        );


        /* =================================================
           💋 KISS
        ================================================= */

        socket.on(
            "send-kiss",
            () => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                kissCount++;


                io
                    .to(COUPLE_ROOM)
                    .emit(
                        "kiss-count-update",
                        kissCount
                    );


                socket
                    .to(COUPLE_ROOM)
                    .emit(
                        "receive-kiss"
                    );

            }
        );


        /* =================================================
           🫂 HUG
        ================================================= */

        socket.on(
            "virtual-hug",
            () => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                socket
                    .to(COUPLE_ROOM)
                    .emit(
                        "receive-hug"
                    );

            }
        );


        /* =================================================
           👀 LOOK AT ME
        ================================================= */

        socket.on(
            "look-at-me",
            () => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                socket
                    .to(COUPLE_ROOM)
                    .emit(
                        "receive-look-at-me",
                        {
                            senderGender:
                                socket.gender
                        }
                    );

            }
        );

        /* =====================================================
            💬 CHAT
         ===================================================== */

        socket.on(
            "send-chat-message",
            (data) => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {
                    return;
                }

                if (
                    !data ||
                    typeof data.message !==
                    "string"
                ) {
                    return;
                }

                const message =
                    data.message
                        .trim()
                        .slice(0, 1000);

                if (!message) {
                    return;
                }

                const chatData = {

                    senderId:
                        socket.id,

                    message:
                        message,

                    timestamp:
                        new Date().toISOString()

                };

                console.log(
                    `💬 Chat ${socket.id}: ${message}`
                );

                /*
                    Send only to partner.
                    Sender already displays
                    their own message locally.
                */

                socket
                    .to(COUPLE_ROOM)
                    .emit(
                        "receive-chat-message",
                        chatData
                    );

            }
        );

        /* =====================================================
   📸 SEND PHOTO
===================================================== */

        socket.on(
            "send-photo",
            (data) => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {
                    return;
                }

                if (
                    !data ||
                    typeof data.image !==
                    "string"
                ) {
                    return;
                }

                console.log(
                    `📸 Photo received from ${socket.id}`
                );

                /*
                   Send photo only to partner.
                   Photo is NOT stored on server.
                */

                socket
                    .to(COUPLE_ROOM)
                    .emit(
                        "receive-photo",
                        {
                            image: data.image,
                            senderId: socket.id,
                            timestamp:
                                new Date().toISOString()
                        }
                    );

            }
        );

        /* =================================================
           🎯 START / NEXT QUESTION
        ================================================= */

        socket.on(
            "start-couple-question",
            () => {
                console.log(
                    "START QUESTION EVENT RECEIVED:",
                    socket.id,
                    "room",
                    socket.roomCode
                );


                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                const connectedPlayers =
                    getCoupleSockets();


                /*
                    We need exactly two players
                    for this game.
                */

                if (
                    connectedPlayers.length < 2
                ) {

                    socket.emit(
                        "couple-question-waiting",
                        {
                            message:
                                "Waiting for your partner to join... ❤️"
                        }
                    );

                    return;

                }


                /*
                    If a round is completed,
                    user must use Play Again.
                */

                if (
                    coupleGame.completed
                ) {

                    return;

                }


                /*
                    FIRST QUESTION
                */

                if (
                    !coupleGame.activeQuestion &&
                    coupleGame.results.length === 0
                ) {

                    startNewCoupleRound(
                        connectedPlayers.slice(
                            0,
                            2
                        )
                    );


                    createQuestion();


                    broadcastQuestion();


                    return;

                }


                /*
                    CURRENT QUESTION STILL WAITING
                    FOR ANSWERS
                */

                if (
                    coupleGame.activeQuestion &&
                    !coupleGame.revealed
                ) {

                    socket.emit(
                        "couple-question-error",
                        {
                            message:
                                "Answer the current question first. ❤️"
                        }
                    );

                    return;

                }


                /*
                    REVEAL ALREADY HAPPENED.

                    This is the Next button.
                */

                if (
                    coupleGame.revealed
                ) {

                    /*
                        Prevent double-click
                        / two simultaneous Next.
                    */

                    if (
                        coupleGame.nextLocked
                    ) {

                        return;

                    }


                    coupleGame.nextLocked =
                        true;


                    /*
                        Move position.
                    */

                    coupleGame.position++;


                    /*
                        Q10 completed.
                    */

                    if (
                        coupleGame.position >=
                        coupleQuestions.length
                    ) {

                        completeCoupleRound();

                        return;

                    }


                    /*
                        Next question.
                    */

                    createQuestion();


                    broadcastQuestion();

                    return;

                }

            }
        );


        /* =================================================
           🎯 ANSWER QUESTION
        ================================================= */

        socket.on(
            "answer-couple-question",
            (data) => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                const active =
                    coupleGame.activeQuestion;


                if (!active) {

                    socket.emit(
                        "couple-question-error",
                        {
                            message:
                                "This question is no longer active. ❤️"
                        }
                    );

                    return;

                }


                /*
                    Client sends:

                    {
                        roundId,
                        answer
                    }

                    Do NOT expect questionNumber.
                */

                if (
                    !data ||
                    data.roundId !==
                    active.roundId
                ) {

                    socket.emit(
                        "couple-question-error",
                        {
                            message:
                                "This question is no longer active. ❤️"
                        }
                    );

                    return;

                }


                /*
                    Only registered players
                    can answer.
                */

                if (
                    !coupleGame.players.has(
                        socket.id
                    )
                ) {

                    return;

                }


                /*
                    Question already revealed.
                */

                if (
                    coupleGame.revealed
                ) {

                    return;

                }


                const allowedAnswers = [
                    "Me ❤️",
                    "You 😘"
                ];


                if (
                    !allowedAnswers.includes(
                        data.answer
                    )
                ) {

                    return;

                }


                /*
                    Prevent changing answer.
                */

                if (
                    coupleGame.answers.has(
                        socket.id
                    )
                ) {

                    return;

                }


                coupleGame.answers.set(
                    socket.id,
                    data.answer
                );


                console.log(
                    `🎯 ${socket.id} answered ${data.answer}`
                );


                /*
                    Tell ONLY sender.
                */

                socket.emit(
                    "couple-question-answer-received"
                );


                /*
                    Wait for both registered players.
                */

                if (
                    coupleGame.answers.size < 2
                ) {

                    return;

                }


                const playerIds =
                    [
                        ...coupleGame.players
                    ];


                const firstPlayer =
                    playerIds[0];


                const secondPlayer =
                    playerIds[1];


                /*
                    Make sure BOTH designated
                    players answered.
                */

                if (
                    !coupleGame.answers.has(
                        firstPlayer
                    ) ||
                    !coupleGame.answers.has(
                        secondPlayer
                    )
                ) {

                    return;

                }


                const firstAnswer =
                    coupleGame.answers.get(
                        firstPlayer
                    );


                const secondAnswer =
                    coupleGame.answers.get(
                        secondPlayer
                    );

                const firstTarget =
                    firstAnswer === "Me ❤️"
                        ? firstPlayer
                        : secondPlayer;

                const secondTarget =
                    secondAnswer === "Me ❤️"
                        ? secondPlayer
                        : firstPlayer

                const sameAnswer =
                    firstTarget === secondTarget

                const answers = {};


                answers[firstPlayer] =
                    firstAnswer;


                answers[secondPlayer] =
                    secondAnswer;


                const result = {

                    questionNumber:
                        active.questionNumber,

                    question:
                        active.question,

                    answers:
                        answers,

                    sameAnswer:
                        sameAnswer

                };


                coupleGame.results.push(
                    result
                );


                coupleGame.revealed =
                    true;

                coupleGame.nextLocked =
                    false;


                console.log(
                    "🎯 Answers revealed:",
                    result
                );


                /*
                    Reveal to both.
                */

                io
                    .to(COUPLE_ROOM)
                    .emit(
                        "couple-question-reveal",
                        {

                            roundId:
                                active.roundId,

                            questionNumber:
                                active.questionNumber,

                            totalQuestions:
                                active.totalQuestions,

                            question:
                                active.question,

                            answers:
                                answers,

                            sameAnswer:
                                sameAnswer,

                            completedQuestions:
                                coupleGame.results.length

                        }
                    );

            }
        );


        /* =================================================
           ❤️ PLAY AGAIN
        ================================================= */

        socket.on(
            "play-couple-questions-again",
            () => {

                if (
                    socket.roomCode !==
                    COUPLE_ROOM
                ) {

                    return;

                }


                const connectedPlayers =
                    getCoupleSockets();


                if (
                    connectedPlayers.length < 2
                ) {

                    socket.emit(
                        "couple-question-waiting",
                        {
                            message:
                                "Waiting for your partner to join... ❤️"
                        }
                    );

                    return;

                }


                startNewCoupleRound(
                    connectedPlayers.slice(
                        0,
                        2
                    )
                );


                createQuestion();


                broadcastQuestion();


                console.log(
                    `❤️ Play Again → Round #${coupleGame.roundId}`
                );

            }
        );


        /* =================================================
           DISCONNECT
        ================================================= */

        socket.on(
            "disconnect",
            () => {

                console.log(
                    `💔 Device disconnected: ${socket.id}`
                );


                /*
                    If a registered game player
                    disconnects, reset the game.

                    This prevents stale question state.
                */

                if (
                    coupleGame.players.has(
                        socket.id
                    )
                ) {

                    coupleGame =
                    {

                        roundId:
                            coupleGame.roundId,

                        players:
                            new Set(),

                        order:
                            [],

                        position:
                            0,

                        activeQuestion:
                            null,

                        answers:
                            new Map(),

                        results:
                            [],

                        revealed:
                            false,

                        completed:
                            false,

                        nextLocked:
                            false

                    };


                    console.log(
                        "🎯 Couple Question game reset after player disconnect"
                    );

                }

            }
        );

    }
);


/* =====================================================
   START SERVER
===================================================== */

server.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `💗 Love Connect running at http://localhost:${PORT}`
        );
    }
);