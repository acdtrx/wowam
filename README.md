# Introduction
This tool allows you to install, update and remove World of Warcraft AddOns
from the command line from the curse.com website.

# Installation
You need a working node 4.x environment. Once you have that, use

```
npm install -g wowam
```

This will install the wam tool in your path (osx: /usr/local/bin) and allow
you to use the tool.

The tool will read the WOWPATH variable to identify your WoW installation or
use the default (osx: /Applications/World of Warcraft)

# Usage

## Installing an AddOn
```
wam install <addon>
```

The <addon> parameter represents the name of the addon as seen in the URL
on curse website (eg. for BigWigs is big-wigs).

## Removing an AddOn
```
wam uninstall <addon>
```

The AddOn will be removed along with all its folders. wam stores a list of
folders that were created when installing the AddOn and removes all of them
when you want to uninstall it

## Updating your AddOns
```
wam update-all
```

wam checks all the AddOns it installed against their latest version on curse.
if it finds a newer version on curse, it will download and install that.
