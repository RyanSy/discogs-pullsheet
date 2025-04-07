exports.logError = (error) => {
    if (error.response) {
        console.error('The request was made and the server responded with a status code that falls out of the range of 2xx.');
        console.error(error.response.data);
        console.error(error.response.status);
        console.error(error.response.headers);
    } else if (error.request) {
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error('The request was made but no response was received.');
        console.error(error.request);
    } else {
        console.error('Something happened in setting up the request that triggered an error.');
        console.error(error);
    }
}