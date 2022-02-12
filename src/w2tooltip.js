/**
 * Part of w2ui 2.0 library
 * - Dependencies: mQuery, w2utils, w2base
 *
 * TODO
 * - multiple tooltips to the same anchor
 */

import { w2base } from './w2base.js'
import { query } from './query.js'
import { w2utils } from './w2utils.js'

class Popper extends w2base {
    constructor() {
        // TODO: what events are used for?
        super()
        this.active = {} // all tooltips on screen now
        this.defaults = {
            name            : null,     // name for the overlay, otherwise input id is used
            html            : '',       // text or html
            anchor          : null,     // element it is attached to
            position        : 'auto',   // can be left, right, top, bottom
            auto            : null,     // if auto true, then tooltip will show on mouseEnter and hide on mouseLeave
            showOn          : null,     // when options.auto = true, mouse event to show on
            hideOn          : null,     // when options.auto = true, mouse event to hide on
            // TODO: not done
            align           : 'none',   // can be none, left, right, both (only works for position: top | bottom)
            left            : 0,        // delta for left coordinate
            top             : 0,        // delta for top coordinate
            maxWidth        : null,     // max width
            maxHeight       : null,     // max height
            style           : '',       // additional style for the overlay
            class           : '',       // add class for w2ui-overlay-body
            onShow          : null,     // callBack when shown
            onHide          : null,     // callBack when hidden
            onUpdate        : null,     // callback when tooltip gets updated
            onMoved         : null,     // callback when tooltip is moved
            inputClass      : '',       // add class for input when overlay is shown
            inputStyle      : '',       // add style for input when overlay is shown
            hideOnClick     : false,    // global hide on document click
            hideOnChange    : true,     // hides when input changes
            hideOnKeyPress  : true,     // hides when input key pressed
            hideOnFocus     : false,    // hides when input gets focus
            hideOnBlur      : false,    // hides when input gets blur
        }
    }

    get(name) {
        if (arguments.length == 0) {
            return Object.keys(this.active)
        } else {
            return this.active[name]
        }
    }

    destroy(name) {
        delete this.active[name]
    }

    init(anchor, text) {
        let options, overlay
        let self = this
        if (arguments.length == 0) {
            return
        } else if (arguments.length == 1 && anchor.anchor) {
            options = anchor
            anchor = options.anchor
        } else if (arguments.length === 2 && typeof text === 'string') {
            options = { anchor, html: text }
            text = options.html
        } else if (arguments.length === 2 && typeof text === 'object') {
            options = text
            text = options.html
        }
        options = w2utils.extend({}, this.defaults, options ? options : {})
        if (!text && options.html) text = options.html
        // anchor is func var
        delete options.anchor

        // define overlay
        let name = (options.name ? options.name : anchor.id)
        if (!name) {
            name = 'noname-' +Object.keys(this.active).length
        }
        if (name == anchor.id && this.active[name]) {
            // find unique name
            let find = (name, ind=0) => {
                if (ind !== 0) name = name.substr(0, name.length-2)
                name += '-' + (ind + 1)
                return (this.active['w2overlay-' + name] == null ? name : find(name, ind+1))
            }
            name = find(name)
        }
        if (this.active[name]) {
            overlay = this.active[name]
            overlay.options = w2utils.extend({}, overlay.options, options)
        } else {
            overlay = { id: 'w2overlay-' + name, name, options, anchor, tmp: {} }
            this.active[name] = overlay
        }
        // add event for auto show/hide
        let show = (options.auto === true || options.showOn != null)
        let hide = (options.auto === true || options.hideOn != null)
        if (options.auto === true || show || hide) {
            query(anchor).each((el, ind) => {
                let showOn = 'mouseenter', hideOn = 'mouseleave'
                if (options.showOn) {
                    showOn = String(options.showOn).toLowerCase()
                    delete options.showOn
                }
                if (options.hideOn) {
                    hideOn = String(options.hideOn).toLowerCase()
                    delete options.hideOn
                }
                console.log(show, showOn, hide, hideOn)
                query(el).off('.w2overlay-init')
                if (show) {
                    query(el).on(showOn + '.w2overlay-init', function (event) {
                        options.auto = false
                        self.show(overlay.name, event)
                        event.stopPropagation()
                    })
                }
                if (hide) {
                    query(el).on(hideOn + '.w2overlay-init', function (event) {
                        let overlay = query(this).data('w2overlay')
                        if (overlay) self.hide(overlay.name, event)
                        event.stopPropagation()
                    })
                }
            })
        }
        let ret = {
            overlay,
            then(callback) {
                self.on('show:after', (event) => { callback(event) })
                return ret
            },
            show(callback) {
                self.on('show', (event) => { callback(event) })
                return ret
            },
            hide(callback) {
                self.on('hide', (event) => { callback(event) })
                return ret
            },
            change(callback) {
                self.on('change', (event) => { callback(event) })
                return ret
            },
            moved(callback) {
                self.on('move', (event) => { callback(event) })
                return ret
            }
        }
        return ret
    }

    show(name, event) {
        if (name instanceof HTMLElement || name instanceof Object) {
            let ret
            if (event) {
                ret = this.init(name, event)
             } else {
                ret = this.init(name)
             }
            this.show(ret.overlay.name, event)
            return ret
        }
        let self = this
        let overlay = this.active[name]
        if (!overlay) return
        // event before
        let edata = this.trigger({ phase: 'before', type: 'show', target: name, overlay, originalEvent: event })
        if (edata.isCancelled === true) return
        // normal processing
        if (!overlay.box) {
            // show or hide overlay
            let overlayStyles = 'white-space: nowrap;'
            if (overlay.options.maxWidth && w2utils.getStrWidth(overlay.options.html, overlayStyles) > overlay.options.maxWidth) {
                overlayStyles = 'width: '+ overlay.options.maxWidth + 'px; white-space: inherit; overflow: auto;'
            }
            overlayStyles += ' max-height: '+ (overlay.options.maxHeight ? overlay.options.maxHeight : window.innerHeight - 40) + 'px;'
            if (overlay.options.html === '' || overlay.options.html == null) {
                self.hide(name)
            } else if (overlay.box) {
                query(overlay.box)
                    .find('.w2ui-overlay-body')
                    .attr('style', (overlay.options.style || '') + '; ' + overlayStyles)
                    .addClass(overlay.options.class)
                    .html(overlay.options.html)
                if (typeof overlay.options.onChange === 'function') {
                    overlay.options.onChange(overlay)
                }
            } else {
                overlay.tmp.originalCSS = ''
                if (query(overlay.anchor).length > 0) {
                    overlay.tmp.originalCSS = query(overlay.anchor)[0].style.cssText
                }
                query('body').append(
                    `<div id="${overlay.id}" name="${name}" style="display: none;" class="w2ui-overlay" data-click="stop">
                        <style></style>
                        <div class="w2ui-overlay-body ${overlay.options.class}" style="${overlay.options.style || ''}; ${overlayStyles}">
                            ${overlay.options.html}
                        </div>
                    </div>`)
                overlay.box = query('#'+w2utils.escapeId(overlay.id))[0]
                query(overlay.anchor).data('w2overlay', overlay) // make available to element overlay attached to
                w2utils.bindEvents(overlay.box, {})
            }
            // if it is input, then add style and class
            if (overlay.anchor.tagName == 'INPUT') {
                if (overlay.options.inputStyle) {
                    overlay.anchor.style.cssText += ';' + overlay.options.inputStyle
                }
                if (overlay.options.inputClass) {
                    query(overlay.anchor).addClass(overlay.options.inputClass)
                }
            }
        }
        // needed timeout so that it will not immediately hide
        setTimeout(() => {
            // add on hide events
            let hide = () => { self.hide(overlay.name) }
            let $anchor = query(overlay.anchor)
            if (overlay.anchor.tagName === 'INPUT') {
                $anchor.off('.w2overlay')
                if (overlay.options.hideOnFocus)    $anchor.on('focus.w2overlay', { once: true }, hide)
                if (overlay.options.hideOnBlur)     $anchor.on('blur.w2overlay', { once: true }, hide)
                if (overlay.options.hideOnChange)   $anchor.on('change.w2overlay', { once: true }, hide)
                if (overlay.options.hideOnKeyPress) $anchor.on('keypress.w2overlay', { once: true }, hide)
            }
            if (overlay.options.hideOnClick) {
                if (overlay.anchor.tagName === 'INPUT') {
                    // otherwise hides on click to focus
                    $anchor.on('click.w2overlay', (event) => { event.stopPropagation() })
                }
                query('body')
                    .off('.w2overlay-' + overlay.name)
                    .on('click.w2overlay-' + overlay.name, { once: true }, hide)
            }
        }, 1)
        // move if needed
        overlay.tmp.instant = 3
        this.isMoved(overlay.name)
        // show if needed
        query(overlay.box).css({
            'display': 'block',
            'opacity': '1'
        })
        // event after
        this.trigger(w2utils.extend(edata, { phase: 'after' }))
    }

    hide(name, event) {
        let overlay
        if (arguments.length == 0) {
            Object.keys(this.active).forEach(name => {
                this.hide(name)
            })
            return
        } else if (typeof name == 'string') {
            overlay = this.active[name]
        } else {
            let q = query(name)
            if (q.length > 0) {
                overlay = q.data('w2overlay')
                name = overlay.name
            }
        }
        if (!overlay || !overlay.box) return
        // event before
        let edata = this.trigger({ phase: 'before', type: 'hide', target: name, overlay, originalEvent: event })
        if (edata.isCancelled === true) return
        // normal processing
        if (overlay.tmp.timer) clearTimeout(overlay.tmp.timer)
        overlay.box.remove()
        overlay.box = null
        query(overlay.anchor)
            .off('.w2overlay')
            .removeData('w2overlay')
        // restore original CSS
        if (overlay.anchor.tagName == 'INPUT') {
            overlay.anchor.style.cssText = overlay.tmp.originalCSS
            query(overlay.anchor)
                .off('.w2overlay')
                .removeClass(overlay.options.inputClass)
        }
        query('body').off('.w2overlay-' + overlay.name)
        // event after
        this.trigger(w2utils.extend(edata, { phase: 'after' }))
    }

    // map events to individual overlays
    onShow(event) { this._trigger('onShow', event) }
    onHide(event) { this._trigger('onHide', event) }
    onUpdate(event) { this._trigger('onUpdate', event) }
    onMove(event) { this._trigger('onMove', event) }
    _trigger(name, event) {
        let overlay = this.active[event.target]
        if (typeof overlay.options[name] == 'function') {
            overlay.options[name](event)
        }
    }

    isMoved(name) {
        // TODO: called for each overlay, might consider one for all overlays
        let overlay = this.active[name]
        if (overlay == null || query(overlay.anchor).length === 0 || query(overlay.box).find('.w2ui-overlay-body').length === 0) {
            this.hide(overlay.name)
            return
        }
        let pos = this.getPosition(overlay.name)
        if (overlay.tmp.pos !== pos.left + 'x' + pos.top) {
            if (overlay.tmp.pos && typeof overlay.options.onMoved === 'function') {
                overlay.options.onMoved(overlay)
            }
            query(overlay.box)
                .css({ 'transition': (overlay.tmp.instant ? '0s' : '.2s') })
                .css({
                    left: pos.left + 'px',
                    top : pos.top + 'px'
                })
            overlay.tmp.pos = pos.left + 'x' + pos.top
        }
        if (typeof overlay.tmp.instant != 'boolean') {
            overlay.tmp.instant--
            if (overlay.tmp.instant === 0) {
                overlay.tmp.instant = false
            }
        }
        if (overlay.tmp.timer) clearTimeout(overlay.tmp.timer)
        overlay.tmp.timer = setTimeout(() => { this.isMoved(overlay.name) }, overlay.tmp.instant ? 0 : 100)
    }

    getPosition(name) {
        let overlay = this.active[name]
        let anchor   = overlay.anchor.getBoundingClientRect()
        let tipClass = 'w2ui-arrow-right'
        let tipStyle = ''
        let posLeft  = parseInt(anchor.left + anchor.width + (overlay.options.left ? overlay.options.left : 0))
        let posTop   = parseInt(anchor.top + (overlay.options.top ? overlay.options.top : 0))
        let content  = query(overlay.box).find('.w2ui-overlay-body')
        let style    = content[0].computedStyleMap()
        let padding  = {
            top: style.get('padding-top').value,
            bottom: style.get('padding-bottom').value,
            left: style.get('padding-left').value,
            right: style.get('padding-right').value
        }
        let { width, height } = content[0].getBoundingClientRect()
        if (typeof overlay.options.position === 'string') {
            if (overlay.options.position == 'auto') {
                overlay.options.position = 'top|bottom|right|left'
            }
            overlay.options.position = overlay.options.position.split('|')
        }
        // if (overlay.options.maxWidth) {
        //     width = overlay.options.maxWidth - padding.left
        // }
        // try to fit the overlay on screen in the order defined in the array
        let maxWidth  = window.innerWidth
        let maxHeight = window.innerHeight
        let posFound  = false
        for (let i = 0; i < overlay.options.position.length; i++) {
            let pos = overlay.options.position[i]
            if (pos === 'right') {
                tipClass = 'w2ui-arrow-right'
                tipStyle = `#${overlay.id} .w2ui-overlay-body:before { bottom: 50%; transform: rotate(135deg) translateY(-50%); }`
                posLeft = Math.round(parseInt(anchor.left + anchor.width + (overlay.options.left ? overlay.options.left : 0)
                    + (padding.left + padding.right) / 2 - 10) + document.body.scrollLeft)
                posTop = Math.round(parseInt(anchor.top - height / 2 + anchor.height / 2
                    + (overlay.options.top ? overlay.options.top : 0) + padding.top) - 2
                    + document.body.scrollTop)
            } else if (pos === 'left') {
                tipClass = 'w2ui-arrow-left'
                tipStyle = `#${overlay.id} .w2ui-overlay-body:after { top: 50%; transform: rotate(-45deg) translateY(-50%); }`
                posLeft = Math.round(parseInt(anchor.left + (overlay.options.left ? overlay.options.left : 0)) - width - 20
                    + document.body.scrollLeft)
                posTop = Math.round(parseInt(anchor.top - height / 2 + anchor.height / 2
                    + (overlay.options.top ? overlay.options.top : 0) + padding.top) - 10
                    + document.body.scrollTop)
            } else if (pos === 'top') {
                tipClass = 'w2ui-arrow-bottom'
                tipStyle = `#${overlay.id} .w2ui-overlay-body:after { left: 50%; transform: rotate(45deg) translateX(-50%); }`
                posLeft = Math.round(parseInt(anchor.left - width / 2 + anchor.width / 2
                    + (overlay.options.left ? overlay.options.left : 0) - padding.left) + 5
                    + document.body.scrollLeft)
                posTop = Math.round(parseInt(anchor.top + (overlay.options.top ? overlay.options.top : 0))
                    - height - padding.top + document.body.scrollTop - 2)
            } else if (pos === 'bottom') {
                tipClass = 'w2ui-arrow-top'
                tipStyle = `#${overlay.id} .w2ui-overlay-body:before { right: 50%; transform: rotate(-135deg) translateX(-50%); }`
                posLeft = Math.round(parseInt(anchor.left - width / 2 + anchor.width / 2
                    + (overlay.options.left ? overlay.options.left : 0) - padding.left) + 6
                    + document.body.scrollLeft)
                posTop = Math.round(parseInt(anchor.top + anchor.height + (overlay.options.top ? overlay.options.top : 0))
                    + (padding.top + padding.bottom) / 2 + 2 + document.body.scrollTop)
            }
            let newLeft = posLeft - document.body.scrollLeft
            let newTop = posTop - document.body.scrollTop
            if (newLeft + width + 20 <= maxWidth && newLeft >= 0 && newTop + height <= maxHeight && newTop >= 0) {
                // scroll bar is 20
                posFound = true
                break
            }
        }
        if (!posFound) {
            if (overlay.tmp.hidden != true) {
                overlay.tmp.hidden = true
                query(overlay.box).hide()
            }
        } else {
            if (overlay.tmp.tipClass !== tipClass) {
                overlay.tmp.tipClass = tipClass
                content
                    .removeClass('w2ui-arrow-right w2ui-arrow-left w2ui-arrow-top w2ui-arrow-bottom')
                    .addClass(tipClass)
                    .closest('.w2ui-overlay')
                    .find('style')
                    .text(tipStyle)
            }
            if (overlay.tmp.hidden) {
                overlay.tmp.hidden = false
                overlay.tmp.instant = 3
                query(overlay.box).show()
            }
        }
        return { left: posLeft, top: posTop }
    }
}

class ColorPopper extends Popper {
    constructor() {
        super()
        this.palette = [
            ['000000', '333333', '555555', '777777', '888888', '999999', 'AAAAAA', 'CCCCCC', 'DDDDDD', 'EEEEEE', 'F7F7F7', 'FFFFFF'],
            ['FF011B', 'FF9838', 'FFC300', 'FFFD59', '86FF14', '14FF7A', '2EFFFC', '2693FF', '006CE7', '9B24F4', 'FF21F5', 'FF0099'],
            ['FFEAEA', 'FCEFE1', 'FCF4DC', 'FFFECF', 'EBFFD9', 'D9FFE9', 'E0FFFF', 'E8F4FF', 'ECF4FC', 'EAE6F4', 'FFF5FE', 'FCF0F7'],
            ['F4CCCC', 'FCE5CD', 'FFF1C2', 'FFFDA1', 'D5FCB1', 'B5F7D0', 'BFFFFF', 'D6ECFF', 'CFE2F3', 'D9D1E9', 'FFE3FD', 'FFD9F0'],
            ['EA9899', 'F9CB9C', 'FFE48C', 'F7F56F', 'B9F77E', '84F0B1', '83F7F7', 'B5DAFF', '9FC5E8', 'B4A7D6', 'FAB9F6', 'FFADDE'],
            ['E06666', 'F6B26B', 'DEB737', 'E0DE51', '8FDB48', '52D189', '4EDEDB', '76ACE3', '6FA8DC', '8E7CC3', 'E07EDA', 'F26DBD'],
            ['CC0814', 'E69138', 'AB8816', 'B5B20E', '6BAB30', '27A85F', '1BA8A6', '3C81C7', '3D85C6', '674EA7', 'A14F9D', 'BF4990'],
            ['99050C', 'B45F17', '80650E', '737103', '395E14', '10783D', '13615E', '094785', '0A5394', '351C75', '780172', '782C5A']
        ]
        this.defaults = w2utils.extend({}, this.defaults, {
            transparent: true,
            position: 'top|bottom',
            class: 'w2ui-light',
            color: '#DDDDDD',
            liveUpdate: null, // should be liveUpdate
            style: 'padding: 0; border: 1px solid silver;'
        })
    }

    init(anchor, text) {
        let options, self = this
        if (arguments.length == 1 && anchor.anchor) {
            options = anchor
            anchor = options.anchor
        } else if (arguments.length === 2 && typeof text === 'object') {
            options = text
            options.anchor = anchor
        }
        options = w2utils.extend({}, this.defaults, options)
        // add remove transparent color
        if (options.transparent && this.palette[0][1] == '333333') {
            this.palette[0].splice(1, 1)
            this.palette[0].push('')
        }
        if (!options.transparent && this.palette[0][1] != '333333') {
            this.palette[0].splice(1, 0, '333333')
            this.palette[0].pop()
        }
        if (options.color) options.color = String(options.color).toUpperCase()
        if (typeof options.color === 'string' && options.color.substr(0,1) === '#') options.color = options.color.substr(1)
        if (options.liveUpdate == null) options.liveUpdate = true
        // color html
        options.html = this.getColorHTML(options)
        let ret = super.init(options)
        this.on('show:after', (event) => {
            if (ret.overlay && ret.overlay.box) {
                let actions = query(ret.overlay.box).find('.w2ui-eaction')
                w2utils.bindEvents(actions, this)
            }
        })
        // add select method
        ret.select = (callback) => {
            self.on('select', (event) => { callback(event) })
            return ret
        }
        return ret
    }

    select(color, event, el) {
        let name = query(el).closest('.w2ui-overlay').attr('name')
        let overlay = this.get(name)
        // event before
        let edata = this.trigger({ phase: 'before', type: 'select', color, target: name, overlay, originalEvent: event })
        if (edata.isCancelled === true) return
        // if anchor is input - live update
        if (overlay.anchor.tagName === 'INPUT') {
            query(overlay.anchor).val(color)
        }
        query(el.parentNode.parentNode).find('.w2ui-selected').removeClass('w2ui-selected')
        query(el).addClass('w2ui-selected')
        // event after
        this.trigger(w2utils.extend(edata, { phase: 'after' }))
    }

    change(color, event, el) {
        let name = query(el).closest('.w2ui-overlay').attr('name')
        let overlay = this.get(name)
        if (overlay.anchor.tagName === 'INPUT') {
            query(overlay.anchor).change()
        }
    }

    tabClick(index, event, el) {
        let name = query(el).closest('.w2ui-overlay').attr('name')
        let overlay = this.get(name)
        query(overlay.box).find('.w2ui-color-tab').removeClass('selected')
        query(el).addClass('selected')
        query(overlay.box)
            .find('.w2ui-tab-content')
            .hide()
            .closest('.w2ui-colors')
            .find('.tab-'+ index)
            .show()
    }

    getColorHTML(options) {
        let border
        let html = `
            <div class="w2ui-colors">
                <div class="w2ui-tab-content tab-1">`
        for (let i = 0; i < this.palette.length; i++) {
            html += '<div class="w2ui-color-row">'
            for (let j = 0; j < this.palette[i].length; j++) {
                let color = this.palette[i][j]
                if (color === 'FFFFFF') border = '; border: 1px solid #efefef'; else border = ''
                html += `
                    <div class="w2ui-color w2ui-eaction ${color === '' ? 'w2ui-no-color' : ''} ${options.color == color ? 'w2ui-selected' : ''}"
                        style="background-color: #${color + border};" name="${color}" index="${i}:${j}"
                        data-mousedown="select|${color}|event|this" data-mouseup="change|${color}|event|this">&nbsp;
                    </div>`
            }
            html += '</div>'
            if (i < 2) html += '<div style="height: 8px"></div>'
        }
        html += '</div>'
        // advanced tab
        html += `
            <div class="w2ui-tab-content tab-2" style="display: none">
                <div class="color-info">
                    <div class="color-preview-bg"><div class="color-preview"></div><div class="color-original"></div></div>
                    <div class="color-part">
                        <span>H</span> <input name="h" maxlength="3" max="360" tabindex="101">
                        <span>R</span> <input name="r" maxlength="3" max="255" tabindex="104">
                    </div>
                    <div class="color-part">
                        <span>S</span> <input name="s" maxlength="3" max="100" tabindex="102">
                        <span>G</span> <input name="g" maxlength="3" max="255" tabindex="105">
                    </div>
                    <div class="color-part">
                        <span>V</span> <input name="v" maxlength="3" max="100" tabindex="103">
                        <span>B</span> <input name="b" maxlength="3" max="255" tabindex="106">
                    </div>
                    <div class="color-part" style="margin: 30px 0px 0px 2px">
                        <span style="width: 40px">${w2utils.lang('Opacity')}</span>
                        <input name="a" maxlength="5" max="1" style="width: 32px !important" tabindex="107">
                    </div>
                </div>
                <div class="palette" name="palette">
                    <div class="palette-bg"></div>
                    <div class="value1 move-x move-y"></div>
                </div>
                <div class="rainbow" name="rainbow">
                    <div class="value2 move-x"></div>
                </div>
                <div class="alpha" name="alpha">
                    <div class="alpha-bg"></div>
                    <div class="value2 move-x"></div>
                </div>
            </div>`
        // color tabs on the bottom
        html += `
            <div class="w2ui-color-tabs">
               <div class="w2ui-color-tab selected w2ui-eaction" data-click="tabClick|1|event|this"><span class="w2ui-icon w2ui-icon-colors"></span></div>
               <div class="w2ui-color-tab w2ui-eaction" data-click="tabClick|2|event|this"><span class="w2ui-icon w2ui-icon-settings"></span></div>
               <div style="padding: 5px; width: 100%; text-align: right;">${(typeof options.html == 'string' ? options.html : '')}</div>
            </div>`
        return html
    }

    initColorControls() {

    }
}

class DatePopper extends Popper {
    constructor() {
        super()
    }
}

class TimePopper extends Popper {
    constructor() {
        super()
    }
}

class MenuPopper extends Popper {
    constructor() {
        super()
    }
}

let w2tooltip = new Popper()
let w2color   = new ColorPopper()
let w2date    = new DatePopper()
let w2time    = new TimePopper()
let w2menu    = new MenuPopper()

export { w2tooltip, w2color, w2date, w2time, w2menu }