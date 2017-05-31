HT = new function () {
    // *******************************************************
    // begin: variables
    // *******************************************************

    // *******************************************************
    // begin: variables.constants
    // *******************************************************

    // constant values: start with an underscore (_)
    var _closeTimer = 100;
    var _requestTimer = 500;
    var _showLoadingTime = 1000;
    var _popupClassname = "hts_pop";
    var _popupWindowId = "ht_pop";
    var _popupContentId = "ht_content";
    var _popupFooterId = "ht_footer";
    var _popScriptId = "ht_popscript";
    var _requeryLinkId = "ht_requeryLink";
    var _wordSeperator = "@";
    var spanTemplate = "<i>$1</i>";
    var _federationTimeout = 2500;
    var _contentArea = _ge("b_content");
    // *******************************************************
    // end: variables.constants
    // *******************************************************

    // global variables: start with a dollar sign ($)
    var $activePopup = null;
    var $config = sa_HTConfig;
    var $srcSpan = null;
    var $requestStartTime = null;
    var $requestTimer = null;
    var $closeTimer = null;
    var $showLoadingTimer = null;
    var $federationTimer = null;
    var $cache = [];
    var $ignoreClassNames = ($config && $config.sIgnCls) ? $config.sIgnCls.split("|") : null ;
    var $hovertransToggle = "ht_toggle";
    var $hovertransToggleTab = "ev_hover_trans_btn";
    var $stateOn = true;
    var $htCookieName= ($config && $config.sCook) ? $config.sCook : "_FP";
    var $crumbName = ($config && $config.sQryKey) ? $config.sQryKey : "hta";

    // *******************************************************
    // end: variables
    // *******************************************************

    function AddSpanForWords(node)
    {
        //Filter out some DOM element should not be changed
        if ((node.tagName == "SCRIPT") || node.tagName == "STYLE" || node.tagName == "CITE" || node.tagName == "text" || node.getAttribute && node.getAttribute("hover-trans") && node.getAttribute("hover-trans") == "no")
        {
            return;
        }

        if(node.className && node.className.split && $ignoreClassNames )
        {
            var nodeClassNames = node.className.split(" ");
            for(var i=0; i<$ignoreClassNames.length;i++)
            {
                for(var j=0;j<nodeClassNames.length;j++)
                {
                    if($ignoreClassNames[i] == nodeClassNames[j])
                    {
                        return;
                    }
                }
            }
        }

        //Iterate the DOM to add span for each word
        var childrens = node.childNodes;
        if (childrens.length == 0)
        {
            if (NeedProcessNode(node))
            {
                var newContent = node.nodeValue.replace(/(\b(\w|-|'|\u2019)*[A-Za-z](\w|-|'|\u2019)*\b)/ig, spanTemplate);
                newElement = _d.createElement("i");
                newElement.innerHTML = newContent;

                var parentNode = node.parentNode;
                if (newElement.childNodes.length == 1 && parentNode.nodeName == 'I' && parentNode.parentNode.nodeName == 'I')
                {
                    parentNode.onmouseover = parentNode.onmouseout = function (evt) { spanHandler(evt, this); };
                }
                else
                {
                    if ((sb_ie) && (newContent.charAt(0) == " "))
                    {
                        tempElement = document.createTextNode(" ");
                        newElement.insertBefore(tempElement, newElement.childNodes[0]);
                    }

                    node.parentNode.replaceChild(newElement, node);
                    //Attach event for spans
                    var childList = newElement.childNodes;
                    for (var i = 0; i < childList.length; i++)
                    {
                        if (childList[i].nodeName == 'I')
                        {
                            childList[i].onmouseover = childList[i].onmouseout = function (evt) { spanHandler(evt, this); };
                        }
                    }
                }
            }
        }
        else
        {
            for (var i = 0; i < childrens.length; i++)
            {
                AddSpanForWords(childrens[i]);
            }
        }
    }

    function NeedProcessNode(node)
    {
        var sw=/^\s*$/;
        return (node && (node.nodeName == "#text") && !sw.test(node.nodeValue))
    }

    function updateToggleText(toggle)
    {
        if(toggle)
        {
            toggle.innerHTML= $stateOn? $config.sOff : $config.sOn;
        }
    }

    function stateChangeHandler(evt,obj)
    {
        //change the state
        $stateOn= ! $stateOn;

        //set cookie
        sj_cook.set($htCookieName,$crumbName,$stateOn?"on":"off" ,1);

        //change toggle string
        updateToggleText(obj);
    }

    this.closeHoverBox = function ()
    {
        hidePopup();
        var toggle= _ge($hovertransToggle);
        var toggle_tab = _ge($hovertransToggleTab);

        if(toggle && toggle.onclick)
        {
            toggle.onclick(null);
            return false;
        }
        else if (toggle_tab) {
            toggle_tab.click();
            return false;
        }
        else
        {
            return true;
        }
    }

    function spanHandler(evt, span)
    {
        if(!$stateOn)
            return;
        // get cross-browser event type
        var e = sj_ev(evt);
        var evtType = e.type;

        if ("mouseout" == evtType)
        {
            //clear request timer if it exist
            if ($requestTimer)
            {
                sb_ct($requestTimer);
            }

            if ($showLoadingTimer)
            {
                sb_ct($showLoadingTimer);
            }

            if ($federationTimer)
            {
                sb_ct($federationTimer);
            }

            // set timer to close pop up
            $closeTimer = sb_st(function ()
            {
                if ($activePopup) hidePopup();
            }, _closeTimer);

            $srcSpan = sj_et(e);
            var cssArray = $srcSpan.getAttribute('class').split(' ');
            var cssres = '';
            for (var cname in cssArray) {
                if (cname != 'hover_target') {
                    cssres += cname;
                }
            }
            $srcSpan.setAttribute('class', cssres);
        }
        else
        {
            if ("mouseover" == evtType)
            {
                $srcSpan = sj_et(e);
                //clear closerTimer is it exist
                if ($closeTimer)
                {
                    sb_ct($closeTimer);
                }

                //set show timer
                $requestTimer = sb_st(function ()
                {
                    requsetTranslation();
                }, _requestTimer);

                $srcSpan.setAttribute('class', $srcSpan.getAttribute('class') + ' hover_target');
            }
        }
    }

    function popupHandler(evt)
    {

        // get cross-browser event type
        var e = sj_ev(evt);
        var evtType = e.type;

        if ("mouseout" == evtType)
        {
            // set timer to close pop up
            $closeTimer = sb_st(function ()
            {
                hidePopup();
            }, _closeTimer);
        }
        else
        {
            if ("mouseover" == evtType)
            {
                //clear closerTimer is it exist
                if ($closeTimer)
                {
                    sb_ct($closeTimer);
                }
            }
        }
    }

    function hidePopup()
    {
        if (_ge(_popupWindowId).style.display != 'none')
        {
            _ge(_popupWindowId).style.display = 'none';
            HT.Hide(_ge(_popupWindowId).word);
        }
    }

    this.Hide = function (word)
    {
        // declared as public for instrumentation
    }

    function requsetTranslation()
    {
        var word = $srcSpan.innerHTML;
        $activePopup.word = word;
        //generate popup footer
        var moreUrl = $config.sMoUrl.replace("{0}", word);
        var logoLink = "<span id='ht_logo'></span>";
        var downloadLink = '<a href="https://bingdict.chinacloudsites.cn/" target="_blank" class="ht_download">' + $config.sDeskTop + '</a>';
        var closeLink = '<a href="'+ $config.sOffUrl +'" onclick="return HT.closeHoverBox();" class="ht_close">' + $config.sHoverOff + '</a>';


        var resHTML = logoLink + closeLink + downloadLink;
        _ge(_popupFooterId).innerHTML = resHTML;

        //Check cache first
        if ($cache[word] && (typeof ($cache[word]) == "string"))
        {
            _ge(_popupContentId).innerHTML = $cache[word];
            $activePopup.style.display = "block";
            positionWindow();
            return;
        }

        //Set Timeout to show loading window
        $showLoadingTimer = sb_st(function ()
        {
            showLoadingWindow();
        }, _showLoadingTime);

        //Remove previous js if exists
        var js = _ge(_popScriptId)
        if (js)
        {
            sj_b.removeChild(js);
        }

        $requestStartTime = new Date();
        //Inject a js after content to send request
        HT.Request($srcSpan.innerHTML);
        var url = $config.uBase.replace(/&amp;/g, '&').concat(word);
        var ajax = sj_gx();

        ajax.open("GET", url, true);
        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4) {
                if (ajax.status == 200) {
                    popupHTML = ajax.responseText;
                    ht_apply(word, popupHTML);
                }
                else {
                    federationTimeOut($srcSpan.innerHTML);
                }
            }
        }

        ajax.send();
    }

    this.Show = function (word)
    {
        // declared as public for instrumentation
    }

    this.Request = function (word)
    {
        // declared as public for instrumentation
    }

    function showLoadingWindow()
    {
        //show "Loading..." message
        _ge(_popupContentId).innerHTML = $config.sLod;
        $activePopup.style.display = "block";

        positionWindow();
    }

    function federationTimeOut(word)
    {
        HT.TimeOut(word);
        var js = _ge(_popScriptId);
        if (js)
        {
            sj_b.removeChild(js);
        }
        _ge(_popupContentId).innerHTML = $config.sFto;
        positionWindow();
    }

    this.TimeOut = function (word)
    {
        // declared as public for instrumentation
    }

    // return the actual width of the window in pixels or -1 if browser not compliant
    function getWindowWidth()
    {
        var wWidth = -1;
        // use documentElement.clientWidth as document.innerWidth includes the vertical scrollbar
        if (sb_de && sb_de.clientWidth)
        {
            wWidth = sb_de.clientWidth;
        }
        return wWidth;
    }

    // return the actual height of the window in pixels or -1 if browser not compliant
    function getWindowHeight()
    {
        var wHeight = -1;
        // Non-IE
        if (typeof (_w.innerHeight) == 'number')
        {
            wHeight = _w.innerHeight;
        }
            // IE 6+ in 'standards compliant mode'
        else if (sb_de && sb_de.clientHeight)
        {
            wHeight = sb_de.clientHeight;
        }
        return wHeight;
    }

    // return scroll amount in pixels or 0 if browser not compliant
    function getScrollY()
    {
        var scrOfY = 0;
        // Netscape compliant
        if (typeof (_w.pageYOffset) == 'number')
        {
            scrOfY = _w.pageYOffset;
        }
            // DOM compliant
        else if (sj_b && sj_b.scrollTop)
        {
            scrOfY = sj_b.scrollTop;
        }
            // IE6 standards compliant mode
        else if (sb_de && sb_de.scrollTop)
        {
            scrOfY = sb_de.scrollTop;
        }

        return scrOfY;
    }

    function getPosition(o)
    {
        var x = sj_go(o, "Left");
        var top = sj_go(o, "Top");
        var y = top + o.offsetHeight;
        var screenW = getWindowWidth();
        var screenH = getWindowHeight();
        var scorllX = sb_de.scrollLeft;
        var scrollY = getScrollY();
        var oW = parseInt($activePopup.clientWidth);
        var oH = parseInt($activePopup.clientHeight);
        if ((x + oW) > (screenW + scorllX))
        {
            var x1 = screenW + scorllX - oW - 10;
            x = (x1 > 0) ? x1 : x;
        }
        if ((y + oH) > (screenH + scrollY))
        {
            var y1 = top - oH - 2;
            y = (y1 > 0) ? y1 : y;
        }
        return { x: x, y: y };
    }

    function positionWindow()
    {
        var pos = getPosition($srcSpan);
        $activePopup.style.left = pos.x + "px";
        $activePopup.style.top = pos.y + "px";
    }

    this.Init = function ()
    {
        //check the cookie
        var $tempState = sj_cook.get($htCookieName,$crumbName);
        if($tempState==null)
            $stateOn=true;
        if($tempState)
        {
            $stateOn = ($tempState=="on");
        }
        else
        {
            sj_cook.set($htCookieName,$crumbName, $stateOn?"on":"off", 1);
        }
        // if in bing51visual, do not reload the page when click the toggle
        var toggle = _ge($hovertransToggle);
        if(toggle)
        {
            toggle.onclick= function(evt){stateChangeHandler(evt,this);sj_sp(evt);return false;}
        }

        //Parse the document and add span for English word
        AddSpanForWords(_contentArea);

        $activePopup = _ge(_popupWindowId);

        if (!$activePopup)
        {
            //Create popup div
            $activePopup = sj_ce("div", _popupWindowId, _popupClassname);
            $activePopup.appendChild(sj_ce("div", _popupContentId, 0));
            var footer = sj_ce("div", _popupFooterId, 0);
            $activePopup.appendChild(footer);
            $activePopup.onmouseover = $activePopup.onmouseout = function (evt) { popupHandler(evt); };
            sj_b.appendChild($activePopup);
        }
        else
        {
            $activePopup.onmouseover = $activePopup.onmouseout = function (evt) { popupHandler(evt); };
        }
    }

    this.Apply = function (word, translation)
    {
        if ($federationTimer)
        {
            sb_ct($federationTimer);
        }
        if ($showLoadingTimer)
        {
            sb_ct($showLoadingTimer);
        }
        var now = new Date();
        HT.Success(word, now - $requestStartTime);
        if (translation)
        {
            //Fill in the translation result to popup content
            var title = $config.sIsEnSearch && $config.sIsEnSearch == 'true' ? word : '<a href="' + $config.sMoUrl.replace("{0}", word) + '" target="_blank" onclick="HT.MoreLinkClick();">' + word + '</a>';
            var moreLink = '<h4>' + title + '</h4>';
            translation = translation.replace("<span id=\"ht_logo\"></span>", "").replace("<h4>" + word + "</h4>", moreLink);
            var decodeTranslation = decodeURI(translation);
            if ($cache[word] == undefined)
            {
                $cache[word] = decodeTranslation;
            }
            _ge(_popupContentId).innerHTML = decodeTranslation;

        }
        else
        {
            //No result, show the no-result message
            _ge(_popupContentId).innerHTML = "<div><h4 style='margin-right:10'>" + word + "</h4><div>" + $config.sNrst + "</div></div>";
            //footer no changed
            //_ge(_popupFooterId).innerHTML = "";
        }
        $activePopup.style.display = "block";
        positionWindow();
    }

    this.Success = function (word, duration)
    {
        // declared as public for instrumentation
    }

    this.MoreLinkClick = function ()
    {
        // declared as public for instrumentation
    }

    this.TurnOffLinkClick = function ()
    {
        // declared as public for instrumentation
        hidePopup();
    }

    this.RequeryLinkClick = function ()
    {
        // declared as public for instrumentation
    }

    this.Disable = function ()
    {
        $stateOn = false;
    }

    this.Enable = function ()
    {
        $stateOn = true;
    }
}

function ht_apply(word, translation)
{
    HT.Apply(word, translation);
}

HT.Init();

sj_evt.bind("htInit", function () {
    HT.Init();
});

sj_evt.bind("htDisable", function () {
    HT.Disable();
});

sj_evt.bind("htEnable", function () {
    HT.Enable();
});