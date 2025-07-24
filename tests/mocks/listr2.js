module.exports = {
    Listr: class Listr {
        constructor(tasks) {
            this.tasks = tasks;
        }
        run() {
            return Promise.resolve();
        }
    }
};
