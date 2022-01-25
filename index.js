/*****License*******************************************************************
**  TES286 Onedrive Online Panel                                              **
**  Copyright (C) 2016-2022  TES286                                           **
**  This program is free software: you can redistribute it and/or modify      **
**  it under the terms of the GNU General Public License as published by      **
**  the Free Software Foundation, either version 3 of the License, or         **
**  (at your option) any later version.                                       **
**                                                                            **
**  This program is distributed in the hope that it will be useful,           **
**  but WITHOUT ANY WARRANTY; without even the implied warranty of            **
**  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the             **
**  GNU General Public License for more details.                              **
********************************************************************************/

// 依赖 jQuery=3.6.0, bootstrap=3.4.1, jquery.qrcode=1.0.3 clipboard=2.0.8, forge=1.2.1

// 常量
const CLIENT_ID = 'f64e58d4-5604-49e6-82f3-1c0c30f6ee4c';
const OAUTH_AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const OAUTH_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPES = 'offline_access Files.ReadWrite.All Files.ReadWrite user.read';
const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/';
const REDIRECT_URL = location.origin + '/login.msad.html';

// 实用函数
function byte2human(n) {
    var s = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
    var e = Math.floor(Math.log(n) / Math.log(1024));
    return (n / Math.pow(1024, Math.floor(e))).toFixed(2) + s[e];
}
function applyStyleToTagByClass(key, value, classname) {
    var elements = document.getElementsByClassName(classname);
    for (var i = 0; i < elements.length; i++) {
        elements[i].style[key] = value;
    }
}
function addListener(event, secltor, func) {
    $(secltor).on(event, func);
}
function join(list, divider, skip_empty) {
    divider = divider || '';
    skip_empty = skip_empty || true;

    var result = '';
    for (i = 0; i < list.length; i++) {
        if (skip_empty && list[i] == '') continue;
        result += list[i];
        if (i < list.length - 1) result += divider;
    }
    return result;
}
function parseQueryString(url) {
    var queryString = url.split('?')[1];
    var result = {};
    if (queryString) {
        var queryStringList = queryString.split('&');
        for (var i = 0; i < queryStringList.length; i++) {
            var pair = queryStringList[i].split('=');
            result[pair[0]] = pair[1];
        }
    }
    return result;
}
function randomInt() {
    if (window.crypto) {
        var buf = new Uint32Array(1);
        window.crypto.getRandomValues(buf);
        return buf[0];
    } else {
        return Math.floor(Math.random() * Math.pow(2, 32));
    }
}
function sha256(str) {
    return forge.sha256.create().update(str).digest().data
}
function base64urlencode(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
}
function PKCE() {
    var code_verifier = randomInt().toString();
    var code_challenge = base64urlencode(sha256(code_verifier));
    return [code_verifier, code_challenge];
}
// localDB 相关函数
function localDBread(key) {
    return localStorage.getItem(key);
}
function localDBwrite(key, value) {
    localStorage.setItem(key, value);
}
function localDBremove(key) {
    localStorage.removeItem(key);
}
function checkLocalDBAvaible() {
    if (typeof (Storage) !== "undefined") {
        return true;
    } else {
        return false;
    }
}
// 账号相关函数
function checkApiToken(token) {
    var date = $.ajax({
        url: GRAPH_API_ENDPOINT + '/v1.0/me',
        type: 'GET',
        async: false,
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });
    if (date.status.toString().substr(0, 1) == '2') {
        return true;
    } else {
        return false;
    }
}
function checkIfLogin() {
    var token = localDBread('token');
    if (token) {
        return checkApiToken(token);
    } else {
        return false;
    }
}
function refreshApiToken(refresh_token) {
    $.ajax({
        url: OAUTH_TOKEN_ENDPOINT,
        type: 'POST',
        data: {
            'client_id': CLIENT_ID,
            'scope': SCOPES,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token',
            'redirect_uri': REDIRECT_URL
        },
        success: function (data) {
            localDBwrite('token', data.access_token);
            localDBwrite('refresh_token', data.refresh_token);
            localDBwrite('token_expire', data.expires_in);
            localDBwrite('token_time', Date.now());
        }
    });
}
function refreshTokenIfNeeded() {
    var refresh_token = localDBread('refresh_token');
    var token_expire = localDBread('token_expire');
    var token_time = localDBread('token_time');
    if (refresh_token && token_expire && token_time) {
        if (Date.now() > token_time + token_expire * 1000) {
            refreshApiToken(refresh_token);
        }
    }
}
function getApiTokenByCode(code) {
    $.ajax({
        url: OAUTH_TOKEN_ENDPOINT,
        type: 'POST',
        async: false,
        data: {
            'client_id': CLIENT_ID,
            'scope': SCOPES,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URL,
            'code_verifier': localDBread('code_verifier')
        },
        success: function (data) {
            localDBwrite('token', data.access_token);
            localDBwrite('refresh_token', data.refresh_token);
            localDBwrite('token_expire', data.expires_in);
            localDBwrite('token_time', Date.now());
        }
    });
}
function login() {
    var challenge = PKCE();
    var code_verifier = challenge[0];
    var code_challenge = challenge[1];
    localDBwrite('code_verifier', code_verifier);
    var url = OAUTH_AUTH_ENDPOINT + '?response_type=code&code_challenge_method=S256&client_id=' + CLIENT_ID + '&scope=' + SCOPES + '&redirect_uri=' + REDIRECT_URL + '&code_challenge=' + code_challenge;
    localDBwrite('last_url', window.location.href);
    window.location.href = url;
}
function getUserName(){
    var token = localDBread('token');
    var user_name = '(未登录)';
    if (token) {
        $.ajax({
            url: GRAPH_API_ENDPOINT + '/v1.0/me',
            type: 'GET',
            async: false,
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function (data) {
                user_name = data.displayName;
            }
        });
    }
    return user_name;
}
// 事件监听函数
function event_login_button(e) {
    login();
}
function event_logout_button(e) {
    localDBremove('token');
    localDBremove('refresh_token');
    localDBremove('token_expire');
    localDBremove('token_time');
    localDBremove('last_url');
    location.reload();
}
function event_onload(e) {
    var query = parseQueryString(window.location.href);
    if (query.login == 'True') {
        getApiTokenByCode(localDBread('code'));
    }
    if (checkIfLogin()) {
        applyStyleToTagByClass('display', 'none', 'no-login');
        applyStyleToTagByClass('display', 'block', 'had-login');
        refreshTokenIfNeeded();
        $('#username').text(getUserName());
    } else {
        applyStyleToTagByClass('display', 'block', 'no-login');
        applyStyleToTagByClass('display', 'none', 'had-login');
    }
}
function applyEventsListeners() {
    addListener('click', '#login-button', event_login_button);
    addListener('click', '#logout-button', event_logout_button);
    $('body').attr('onload', 'javascript:event_onload()');
}
applyEventsListeners();