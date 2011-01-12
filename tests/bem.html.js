'b-alb' : {
    tag : 'span',
    attrs : function(cc, n) {
        
        merge(
            cc[n],
            {
                title : val.id,
                title : force val.id,
                title : force val.id + old,
                href : '#' + val.id,
                bla : remove
            }
        ) }
}


BEM.HTML.decl('b-alb', {
    onBlock : {
        tag : 'span',
        attr : { 'title' : c.param('id') }
    },
    onBlock : function(c) {
        c
            .tag('span')
            .attr('title', c.param('id'))
    }
});

BEM.HTML.decl('b-alb', {
    onBlock : function(c) {
        c.content().length > 1 ?
            c.attr('blablabla', 'blablabla') :
            c.attr('bla', 'bla');
    }
});
