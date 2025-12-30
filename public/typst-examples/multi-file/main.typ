#import "template.typ": *
// if you have a template
#show: template

= This is the document title

// some additional formatting

#show emph: set text(blue)

// but don't define functions or variables there!
// chapters will not see it

// Now the chapters themselves as some Typst content
#include "chapters/chapter-1.typ"
#include "chapters/chapter-2.typ"
