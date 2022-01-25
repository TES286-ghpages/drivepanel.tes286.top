function parseQueryString(url) {
    var queryString = url.split('?')[1];
    var result = {};
    if(queryString){
        var queryStringList = queryString.split('&');
        for(var i=0;i<queryStringList.length;i++){
            var pair = queryStringList[i].split('=');
            result[pair[0]] = pair[1];
        }
    }
    return result;
}
function localDBwrite(key, value) {
    localStorage.setItem(key, value);
}
function localDBread(key) {
    return localStorage.getItem(key);
}
function main(){
    var url = location.href;
    var queryString = parseQueryString(url);
    var code = queryString['code'];
    localDBwrite('code', code);
    var last_url = localDBread('last_url')
    if(last_url === null){
        last_url = '/';
    }
    last_url.indexOf('?') == -1 ? last_url += '?' : last_url += '&';
    last_url += 'login=True';
    $('#go-back').attr('href', last_url);
    $('#go-back').show();
    location.href = last_url;
}