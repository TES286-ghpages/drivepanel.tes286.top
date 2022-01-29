/*****License*********************************************************************
 **  TES286 Drive Panel                                                         **
 **  Copyright (C) 2016-2022  TES286                                            **
 **  This program is free software: you can redistribute it and/or modify       **
 **  it under the terms of the GNU General Public License as published by       **
 **  the Free Software Foundation, either version 3 of the License, or          **
 **  (at your option) any later version.                                        **
 **                                                                             **
 **  This program is distributed in the hope that it will be useful,            **
 **  but WITHOUT ANY WARRANTY; without even the implied warranty of             **
 **  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the              **
 **  GNU General Public License for more details.                               **
 ********************************************************************************/

// 依赖 jQuery=3.6.0, bootstrap=3.4.1, forge=1.2.1

// 常量
const CLIENT_ID = 'f64e58d4-5604-49e6-82f3-1c0c30f6ee4c';
const OAUTH_AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const OAUTH_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPES = 'offline_access Files.ReadWrite.All Files.ReadWrite user.read';
const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com';
const REDIRECT_URL = location.origin + '/login.msad.html';

// 日志
(function() {
    function info(msg) {
        gtag('event', 'log-info', { msg: msg });
        console.log(msg);
        var count = string2int(document.getElementById('log-count').dataset.logCount);
        /* Example:
        <div class="log alert alert-info" role="alert" id="log-1">
            TES286
            <button class="log-btn-close" data-id="1" onclick="event_close_log(this)"></button>
        </div>
        */
        $('#log-group').append('<div id="log-' + (count + 1) + '"></div>');
        $('#log-' + (count + 1)).attr('class', 'log alert alert-info')
            .attr('role', 'alert')
        $('#log-' + (count + 1)).text(msg);
        $('#log-' + (count + 1)).append('<button class="log-btn-close" data-id="' + (count + 1) + '" onclick="event_close_log(this)"></button>');
        document.getElementById('log-count').dataset.logCount = (count + 1).toString();
    }

    function error(msg) {
        gtag('event', 'log-error', { msg: msg });
        console.error(msg);
        var count = string2int(document.getElementById('log-count').dataset.logCount);
        $('#log-group').append('<div id="log-' + (count + 1) + '"></div>');
        $('#log-' + (count + 1)).attr('class', 'log alert alert-danger')
            .attr('role', 'alert')
        $('#log-' + (count + 1)).text(msg);
        $('#log-' + (count + 1)).append('<button class="log-btn-close" data-id="' + (count + 1) + '" onclick="event_close_log(this)"></button>');
        document.getElementById('log-count').dataset.logCount = (count + 1).toString();
    }

    function warn(msg) {
        gtag('event', 'log-warn', { msg: msg });
        console.warn(msg);
        var count = string2int(document.getElementById('log-count').dataset.logCount);
        $('#log-group').append('<div id="log-' + (count + 1) + '"></div>');
        $('#log-' + (count + 1)).attr('class', 'log alert alert-warning')
            .attr('role', 'alert')
        $('#log-' + (count + 1)).text(msg);
        $('#log-' + (count + 1)).append('<button class="log-btn-close" data-id="' + (count + 1) + '" onclick="event_close_log(this)"></button>');
        document.getElementById('log-count').dataset.logCount = (count + 1).toString();
    }
    window.info = info;
    window.error = error;
    window.warn = warn;
})();

// 实用函数
(function() {
    function byte2human(n) {
        if (!n) return '0 B';
        var s = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
        var e = Math.floor(Math.log(n) / Math.log(1024));
        return (n / Math.pow(1024, Math.floor(e))).toFixed(2) + ' ' + s[e];
    }

    function applyStyleToTagByClass(key, value, classname) {
        var elements = document.getElementsByClassName(classname);
        for (var i = 0; i < elements.length; i++) {
            elements[i].style[key] = value;
        }
    }

    function addListener(event, secltor, func) {
        document.addEventListener(event, function(e) {
            if (e.target.matches(secltor)) {
                func(e);
            }
        });
    }

    function join(list, divider, skip_empty, n) {
        divider = divider || '';
        skip_empty = skip_empty || true;
        n = n || list.length;

        var result = '';
        for (i = 0; i < n; i++) {
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
            gtag('event', 'does_not_support_crypto');
            console.warn('crypto not available, falling back to Math.random, it is not cryptographically secure');
            return Math.floor(Math.random() * Math.pow(2, 32));
        }
    }

    function sha256(str) {
        return forge.sha256.create().update(str).digest().data
    }

    function base64urldecode(str) {
        var pending = str.length % 4;
        if (pending > 0) {
            str += new Array(5 - pending).join('=');
        }
        return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    }

    function base64urlencode(str) {
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
    }

    function PKCE() {
        var code_verifier = '';
        for (var i = 0; i < 16; i++) {
            code_verifier += randomInt().toString();
        }
        var code_challenge = base64urlencode(sha256(code_verifier));
        return [code_verifier, code_challenge];
    }

    function loadAsyncCss() {
        var elements = document.getElementsByTagName("link");
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].rel.toLowerCase() == "stylesheet" && elements[i].media == "async") {
                elements[i].media = "all";
            }
        }
    }

    function parentPath(path) {
        var path_list = path.split('/');
        var _path_list = join(path_list, '/', true, path_list.length - 1).split('/');
        return '/' + join(_path_list, '/', true, _path_list.length - 1);
    }

    function fileName(path) {
        var path_list = path.split('/');
        var _path = join(path_list, '/', true);
        return _path.split('/')[_path.split('/').length - 1];
    }

    function string2int(s) {
        return parseInt(s.replace(/[^0-9]/g, ''));
    }
    window.byte2human = byte2human;
    window.applyStyleToTagByClass = applyStyleToTagByClass;
    window.addListener = addListener;
    window.join = join;
    window.parseQueryString = parseQueryString;
    window.randomInt = randomInt;
    window.sha256 = sha256;
    window.base64urldecode = base64urldecode;
    window.base64urlencode = base64urlencode;
    window.PKCE = PKCE;
    window.loadAsyncCss = loadAsyncCss;
    window.parentPath = parentPath;
    window.fileName = fileName;
    window.string2int = string2int;
})();

// localDB 相关函数
(function() {
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
        if (typeof(Storage) !== "undefined") {
            return true;
        } else {
            return false;
        }
    }
    window.localDBread = localDBread;
    window.localDBwrite = localDBwrite;
    window.localDBremove = localDBremove;
    window.checkLocalDBAvaible = checkLocalDBAvaible;
})();

// 账号
(function() {
    function checkApiToken(token) {
        var data = $.ajax({
            url: GRAPH_API_ENDPOINT + '/v1.0/me',
            type: 'GET',
            async: false,
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (data.status.toString().substr(0, 1) == '2') {
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
            async: false,
            data: {
                'client_id': CLIENT_ID,
                'scope': SCOPES,
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token',
                'redirect_uri': REDIRECT_URL
            },
            success: function(data) {
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
            token_expire = string2int(token_expire);
            token_time = string2int(token_time);
            if (Date.now() > token_time + token_expire - 10 * 60) {
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
            success: function(data) {
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

    function getUserName() {
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
                success: function(data) {
                    user_name = data.displayName;
                }
            });
        }
        return user_name;
    }
    window.checkApiToken = checkApiToken;
    window.checkIfLogin = checkIfLogin;
    window.refreshTokenIfNeeded = refreshTokenIfNeeded;
    window.getApiTokenByCode = getApiTokenByCode;
    window.login = login;
    window.getUserName = getUserName;
})();

// 文件操作
(function() {
    function getFileList(path) {
        var token = localDBread('token');
        var file_list = [{ error: '(未登录)' }];
        if (path && path != '/') {
            var url = GRAPH_API_ENDPOINT + '/v1.0/me/drive/root:' + path + ':/children';
        } else {
            var url = GRAPH_API_ENDPOINT + '/v1.0/me/drive/root/children';
        }
        if (token) {
            $.ajax({
                url: url,
                type: 'GET',
                async: false,
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                success: function(data) {
                    file_list = [];
                    value = data.value;
                    if (value == undefined) {
                        file_list[0] = { error: data };
                        return;
                    }
                    for (var i = 0; i < value.length; i++) {
                        if (value[i].folder == undefined) {
                            // 文件
                            file_list.push({
                                name: value[i].name,
                                type: 'file',
                                id: value[i].id,
                                size: byte2human(value[i].size),
                                user: value[i].lastModifiedBy.user.displayName,
                                time: value[i].lastModifiedDateTime
                            });
                        } else {
                            // 文件夹
                            file_list.push({
                                name: value[i].name,
                                type: 'folder',
                                id: value[i].id,
                                size: value[i].folder.childCount.toString() + '个文件',
                                user: value[i].lastModifiedBy.user.displayName,
                                time: value[i].lastModifiedDateTime
                            });
                        }
                    }
                },
                error: function(data) {
                    file_list = [{ error: data }];
                }
            });
        }
        return file_list;
    }

    function getPath(path) {
        gtag('event', 'getPath', { path: path });
        var file_list = getFileList(path);
        if (file_list[0].error) {
            error(file_list[0].error);
            return;
        }
        $('#FileTable').empty();
        for (i = 0; i < file_list.length; i++) {
            var name = file_list[i].name;
            var type = file_list[i].type;
            var id = file_list[i].id;
            var size = file_list[i].size;
            var user = file_list[i].user;
            var time = file_list[i].time;
            $('#FileTable').append('<tr id="' + base64urlencode(id) + '"></tr>');
            // 选择框
            $('#' + base64urlencode(id)).append('<td><input type="checkbox" class="check" onclick="event_check(this)" data-file-id="' + base64urlencode(id) + '"></td>');
            // 图标
            if (type == 'file') {
                $('#' + base64urlencode(id)).append('<td><i class="far fa-file"></i></td>');
            } else {
                $('#' + base64urlencode(id)).append('<td><i class="far fa-folder"></i></td>');
            }
            // 名称
            $('#' + base64urlencode(id)).append('<td class="item" data-path="' + path + '/' + name + '" data-type="' + type + '">' + name + '</td>');
            // 修改者
            $('#' + base64urlencode(id)).append('<td>' + user + '</td>');
            // 大小
            $('#' + base64urlencode(id)).append('<td>' + size + '</td>');
        }
        window.current_path = path;
    }

    function progress_check() {
        window.checked_file_list = window.checked_file_list || [];
        switch (window.checked_file_list.length) {
            case 0:
                applyStyleToTagByClass('display', 'none', 'show-mutil');
                applyStyleToTagByClass('display', 'none', 'show-alone');
                applyStyleToTagByClass('display', 'block', 'show-default');
                break;
            case 1:
                applyStyleToTagByClass('display', 'none', 'show-mutil');
                applyStyleToTagByClass('display', 'none', 'show-default');
                applyStyleToTagByClass('display', 'block', 'show-alone');
                break;
            default:
                applyStyleToTagByClass('display', 'none', 'show-default');
                applyStyleToTagByClass('display', 'none', 'show-alone');
                applyStyleToTagByClass('display', 'block', 'show-mutil');
                break;
        }
    }

    function create_new_folder(name) {
        var token = localDBread('token');
        var parent_path = parentPath(name);
        if (parent_path == '/') {
            var url = GRAPH_API_ENDPOINT + '/v1.0/me/drive/root/children';
        } else {
            var url = GRAPH_API_ENDPOINT + '/v1.0/me/drive/root:' + parent_path + ':/children';
        }
        if (name.startsWith('/')) {
            name = name.substring(1);
        }
        $.ajax({
            url: url,
            type: 'POST',
            async: false,
            headers: {
                'Authorization': 'Bearer ' + token
            },
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({
                '@microsoft.graph.conflictBehavior': 'fail',
                'name': name,
                'folder': {}
            }),
            success: function(data) {
                getPath(parent_path);
            },
            error: function(data) {
                error(JSON.stringify(data));
            }
        });
    }

    function create_new_file(name) {
        // 其实也就是上传一个空文件
        var token = localDBread('token');
        name = '/' + join(name.split('/'), '/', true); // 去重复的斜杠
        var url = GRAPH_API_ENDPOINT + '/v1.0/me/drive/root:' + name + ':/content';
        $.ajax({
            url: url,
            type: 'PUT',
            async: false,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/octet-stream'
            },
            data: '',
            success: function(data) {
                getPath(parentPath(name));
            }
        });
    }

    function getFileByID(id) {
        file = {};
        $.ajax({
            url: GRAPH_API_ENDPOINT + '/v1.0/me/drive/items/' + id,
            type: 'GET',
            async: false,
            headers: {
                'Authorization': 'Bearer ' + localDBread('token')
            },
            success: function(data) {
                file = data;
            },
            error: function(data) {
                error(JSON.stringify(data));
            }
        });
        return file;
    }

    function deleteFileByID(id) {
        var token = localDBread('token');
        $.ajax({
            url: GRAPH_API_ENDPOINT + '/v1.0/me/drive/items/' + id,
            type: 'DELETE',
            async: false,
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function(data) {
                void(data);
            },
            error: function(data) {
                error(JSON.stringify(data));
            }
        });
    }

    function shareFileByID(id, type, scope, password) {
        var token = localDBread('token');
        var url = GRAPH_API_ENDPOINT + '/v1.0/me/drive/items/' + id + '/createLink';
        type = type || 'view';
        var data = { type: type };
        if (scope) {
            data.scope = scope;
        }
        if (password) {
            data.password = password;
        }
        var url = '';
        $.ajax({
            url: url,
            type: 'POST',
            async: false,
            headers: {
                'Authorization': 'Bearer ' + token
            },
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify(data),
            success: function(data) {
                url = data.link.webUrl;
            },
            error: function(data) {
                error(JSON.stringify(data));
                url = undefined;
            }
        });
        return url;
    }

    function getParentID(path) {
        var token = localDBread('token');
        var id = '';
        if (!path || path == '/') {
            var url = GRAPH_API_ENDPOINT + '/v1.0/me/drive/root';
        } else {
            var url = GRAPH_API_ENDPOINT + '/v1.0/me/drive/root:' + path;
        }
        $.ajax({
            url: url,
            type: 'GET',
            async: false,
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function(data) {
                id = data.id;
            },
            error: function(data) {
                error(data.responseText);
            }
        });
        return id;
    }

    window.getFileList = getFileList;
    window.getPath = getPath;
    window.progress_check = progress_check;
    window.create_new_folder = create_new_folder;
    window.create_new_file = create_new_file;
    window.getFileByID = getFileByID;
    window.deleteFileByID = deleteFileByID;
    window.shareFileByID = shareFileByID;
    window.getParentID = getParentID;
})();

// 事件监听函数
(function() {
    function event_login_button(e) {
        gtag('event', 'login_button');
        login();
    }

    function event_logout_button(e) {
        gtag('event', 'logout_button');
        localDBremove('token');
        localDBremove('refresh_token');
        localDBremove('token_expire');
        localDBremove('token_time');
        localDBremove('last_url');
        localDBremove('code_verifier');
        location.reload();
    }

    function event_onload(e) {
        gtag('event', 'onload');
        loadAsyncCss();
        var query = parseQueryString(window.location.href);
        gtag('event', 'query', query);
        if (query.login == 'True') {
            getApiTokenByCode(localDBread('code'));
            localDBremove('code');
            location.href = localDBread('last_url');
            return;
        }
        refreshTokenIfNeeded();
        if (checkIfLogin()) {
            applyStyleToTagByClass('display', 'none', 'no-login');
            applyStyleToTagByClass('display', 'block', 'had-login');
            $('#username').text(getUserName());
            getPath('/');
        } else {
            applyStyleToTagByClass('display', 'block', 'no-login');
            applyStyleToTagByClass('display', 'none', 'had-login');
        }
    }

    function event_close_log(e) {
        gtag('event', 'close_log');
        document.getElementById("log-" + e.dataset.id).style.display = "none";
    }

    function event_check(e) {
        gtag('event', 'check', { checked: e });

        window.checked_file_list = window.checked_file_list || [];
        // 点击 checkbox 时，把选中的文件加入到 window.checked_file_list
        // 取消选择, 删除e
        if (e.checked) {
            window.checked_file_list.push(e.dataset.fileId);
        } else {
            var index = window.checked_file_list.indexOf(e.dataset.fileId);
            if (index > -1) {
                window.checked_file_list.splice(index, 1);
            }
        }
        progress_check();
    }

    function event_check_all(e) {
        gtag('event', 'check_all');
        // 点击 checkbox 时，把选中的文件加入到 window.checked_file_list
        // 取消选择, 删除e
        if (e.checked) {
            window.checked_file_list = [];
            $('#FileTable').find('input[type="checkbox"]').each(function(index, element) {
                window.checked_file_list.push(element.dataset.fileId);
                element.checked = true;
            });
        } else {
            window.checked_file_list = [];
            $('#FileTable').find('input[type="checkbox"]').each(function(index, element) {
                element.checked = false;
            });
        }
        progress_check();
    }

    function event_new_file() {
        gtag('event', 'new_file');
        var path = window.current_path || '/';
        if (path == '/') {
            path = '';
        }
        var name = prompt('请输入文件名: ');
        if (name) {
            create_new_file(path + '/' + name);
        }
    }

    function event_new_folder() {
        gtag('event', 'new_folder');
        var path = window.current_path || '/';
        if (path == '/') {
            path = '';
        }
        var name = prompt('请输入文件夹名: ');
        if (name) {
            create_new_folder(path + '/' + name);
        }
    }

    function event_download() {
        var file_list = window.checked_file_list || [];
        var file_id = base64urldecode(file_list[0]);
        var file = getFileByID(file_id)
        window.open(file['@microsoft.graph.downloadUrl']);
    }

    function event_delete() {
        var file_list = window.checked_file_list || [];
        for (var i = 0; i < file_list.length; i++) {
            var file_id = base64urldecode(file_list[i]);
            deleteFileByID(file_id);
        }
        if (window.current_path) {
            getPath(window.current_path);
        } else {
            getPath('/');
        }
        window.checked_file_list = [];
        progress_check();
    }

    function event_share() {
        var scope = prompt('请输入分享范围anonymous(任何拥有链接的人)/organization(组织内,组织版), 留空为组织默认: ');
        var type = prompt('请输入权限[view(只读)]/edit(读写)/embed(嵌入,仅支持个人版账户): ');


        var file_list = window.checked_file_list || [];
        var file_id = base64urldecode(file_list[0]);
        var url = shareFileByID(file_id, scope, type);
        if (url) {
            info('分享链接: ' + url);
        }
    }

    function event_offline_download() {
        var token = localDBread('token');
        var url = prompt('请输入下载地址: ');
        var name = prompt('请输入文件名: ');
        if (!name.startsWith('/')) {
            name = '/' + name;
        }
        if (url && name) {
            var parent_id = getParentID(parentPath(name));
            if (!parent_id) {
                error('找不到父目录, 请检查文件名中路径是否存在');
                return;
            }
            var xhr = $.ajax({
                url: GRAPH_API_ENDPOINT + '/v1.0/me/drive/items/' + parent_id + '/children',
                type: 'POST',
                async: false,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    "Prefer": "respond-async"
                },
                data: JSON.stringify({
                    '@microsoft.graph.sourceUrl': url,
                    'name': fileName(name),
                    'file': {}
                })
            });
            if (xhr.status == 202) {
                info('下载任务已提交, 监控链接: ' + xhr.getResponseHeader('Location'));
            } else {
                error('下载任务提交失败 ' + xhr.responseText);
            }
        }
    }

    function event_refresh() {
        var path = window.current_path || '/';
        getPath(path);
    }

    function applyEventsListeners() {
        addListener('click', '#login-button', event_login_button);
        addListener('click', '#logout-button', event_logout_button);
        addEventListener('load', event_onload);
    }
    window.event_login_button = event_login_button;
    window.event_logout_button = event_logout_button;
    window.event_onload = event_onload;
    window.event_close_log = event_close_log;
    window.event_check = event_check;
    window.event_check_all = event_check_all;
    window.event_new_file = event_new_file;
    window.event_new_folder = event_new_folder;
    window.event_download = event_download;
    window.event_delete = event_delete;
    window.event_share = event_share;
    window.event_offline_download = event_offline_download;
    window.event_refresh = event_refresh;
    window.applyEventsListeners = applyEventsListeners;
})();

// 其他的东西
window.dataLayer = window.dataLayer || [];

function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-P0D0K5QM78');
applyEventsListeners();