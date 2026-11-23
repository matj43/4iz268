const audioContext = new AudioContext();
let currentNote = 0;
let playingNotes = [];
let songId = "skakal-pes";

class Tile {
    constructor(name, tile, key, sound) {
        this.name = name;
        this.tile = $("#" + tile);
        this.audioBuffer = null;
        this.key = key;
        this.source;
        this.pressed = false;

        $.ajax({
            url: sound,
            method: 'GET',
            xhrFields: {
                responseType: 'arraybuffer'
            },
            success: (data) => {
                audioContext.decodeAudioData(data)
                    .then((buffer) => {
                        this.audioBuffer = buffer;
                        
                        console.log('Načteno:', this.name, buffer.duration.toFixed(2), 's');
                    })
                    .catch((err) => console.error('Nelze dekódovat:', this.name, err));
            },
            error: (xhr, status, err) => {
                console.error('Chyba při načítání:', status, err);
            }
        });

        this.tile.on("mousedown", () => this.play());
        this.tile.on("mouseup", () => this.stop());

        $(document).on("keydown", (e) => {
            if (e.repeat) return;
            if ($(e.target).is("input, textarea")) return;
            if (e.key.toLowerCase() !== this.key) return;
            if (this.pressed) return;
            this.pressed = true;
            this.tile.css("filter", "brightness(80%)")
            this.play();
        });

        $(document).on("keyup", (e) => {
            if (e.key.toLowerCase() === this.key) {
                this.pressed = false;
                this.tile.css("filter", "brightness(100%)");
                this.stop();
            }
        });
    }

    play() {
        if (playingNotes.length !== 0) {
            if (currentNote == 0) {
                $(".note").removeClass("played").removeClass("wrong");
            }
            this.checkNote();
        }


        if (!this.audioBuffer) return;

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        this.stop();

        this.source = audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(audioContext.destination);
        this.source.start();
    }

    stop() {
        if (this.source) {
            this.source.stop();
            this.source.disconnect();
            this.source = null;
        }
    }

    checkNote() {
        if (this.name == playingNotes[currentNote]) {
            $("#note-" + currentNote).addClass("played");
            if (currentNote == playingNotes.length - 1) {
                $(".notes").addClass("win");
                SaveProgress(songId);
                LoadSongList();
                console.log("you have won")
            } else {
                currentNote++;
                $(".notes").removeClass("win");
            }
        } else {
            $("#note-" + currentNote).addClass("wrong");
            currentNote=0
        }
    }
}

let keys = [
    {name: "c", key: "s"},
    {name: "csharp", key: "e"},
    {name: "d", key: "d"},
    {name: "dsharp", key: "r"},
    {name: "e", key: "f"},
    {name: "f", key: "g"},
    {name: "fsharp", key: "y"},
    {name: "g", key: "h"},
    {name: "gsharp", key: "u"},
    {name: "a", key: "j"},
    {name: "asharp", key: "i"},
    {name: "h", key: "k"},
]

$(document).ready(
    $(function () {
    const tiles = keys.map(
        (n) => new Tile(n.name, n.name, n.key, "assets/audio/" + n.name + ".mp3")
    );
    LoadSongList();
}))

$("#reset").on("click", () => {
   ResetNotes();
})

$("#resetProgress").on("click", () => {
   localStorage.removeItem("progress");
   LoadSongList();
})

function LoadSong(notes, id) {
    ResetNotes();
    songId = id;
    playingNotes = notes; 
    currentNote = 0;

    let numOfNotes = 0;
    let noteElement;
    notes.map((note) => {
        noteElement = new $("<div>");
        noteElement.attr("id", "note-" + numOfNotes);
        noteElement.addClass("note");
        noteElement.css("left", (numOfNotes * 40) + "px");
        $("#" + note + "-line").append(noteElement);
        numOfNotes++;
        console.log("Pridano do not: " + note);
    })
}

function ResetNotes() {
    playingNotes = [];
    currentNote = 0;
    songId = "";
    $(".notes").removeClass("win");
    $(".notes .note").remove();
}

//////////////////// Song handeling

function LoadSongList() {
    $(".song").remove();
    $.ajax({
        url: "game/songs.json",
        method: 'GET',
        success: (data) => {
            progress = LoadProgress();
            data.songs.map(song => {
                let button = $("<button>").addClass("song").text(song.name).on("click", () => {
                    songId = song.id;
                    LoadSongAjax(song);
                })

                if (progress.includes(song.id)) {
                    button.append("✅");
                }

                 $("#songs").append(button);
            })
        
        },
        error: (status, err) => {
            console.error('Chyba při načítání:', status, err);
            $("#songs").append("<p>Chyba při načítání písniček</p>").css("color", "red");
        }
    });
}

function LoadSongAjax(song) {
    $.ajax({
        url: song.url,
        method: 'GET',
        success: (data) => {
            LoadSong(data.notes, song.id);
        },
        error: (status, err) => {
            console.error('Chyba při načítání písničky');
            $("#songs").append("<p>Chyba při načítání písničky</p>").css("color", "red");
        }
    });
}

function SaveProgress(songId) {
    let songs = LoadProgress();
    if (!songs.includes(songId)) {
        songs.push(songId);
    }

    localStorage.setItem("progress", JSON.stringify({ songs }));
}

function LoadProgress() {
    const data = localStorage.getItem("progress");
    if (data == null) return [];

    try {
        return JSON.parse(data).songs ?? [];
    } catch {
        return [];
    }
}
