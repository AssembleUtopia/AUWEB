'use strict';

function menuFix() {

    var heder = document.getElementById('header');
    var higth = $('#block-1').height();

    $(window).scroll(function () {

        if ($(window).scrollTop() > higth) {

            heder.classList.add('js-header-fix');
        } else {

            heder.classList.remove('js-header-fix');
        }
    });
}

$(document).ready(function () {

    menuFix();
});

$(window).load(function () {});

$(window).resize(function () {});
//# sourceMappingURL=develop_1.js.map
