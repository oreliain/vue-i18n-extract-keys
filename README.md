<h1 align="center">@oreliain/vue-i18n-extract-keys</h1>
<p align="center">

</p>

---

`vue-i18n-extract-keys` is built to work with your Vue.js projects using [vue-i18n](https://kazupon.github.io/vue-i18n/). When run `vue-18n-extract-keys`, it extracts, from your Vue.js source code, any `vue-i18n` key usages (ex. $t(''), $tc(''), ...) and generates corresponding assets locales files.

## :book: Documentation

### Installation
```bash
## NPM
npm install --save-dev @oreliain/vue-i18n-extract-keys

## or

## Yarn
yarn add -D @oreliain/vue-i18n-extract-keys
```

#### Getting Started

To extract keys executed the command : 
```bash
npx vue-i18n-extract-keys
```

or create a script entry in your `package.json`:
```json
{
  "scripts": {
    "i18n:extract": "vue-i18n-extract-keys -o ./src/locales -l en fr -e -x"
  }
}
```

The command takes the following options : 

##### -l, --locales (default: "en") :
The locales to generate

###### Example

Generate `en.json` and `fr.json` files in `./i18n/locales`
```bash
npx vue-i18n-extrack-keys -l en fr
```

##### -s, --source (default: ["src"]) :
The source directories to parse for keys extracting

###### Example

Extract keys from `./sources` and `./components` directories
```bash
npx vue-i18n-extrack-keys -s ./sources -s ./components
```

##### -o, --output (default: "i18n/locales") :
The target directory in which locale generated files will be stored. **The directory must already exist**

###### Example

Extract keys to `./lang` directory
```bash
npx vue-i18n-extrack-keys -o ./lang
```
##### -x, --withIndexFile (default: false) :
Create an index file in the output directory that export all your locales as a module. 

###### Example

```bash
npx vue-i18n-extrack-keys -l en fr -o ./lang --withIndexFile
```

will create a `./lang/index.js` file that contains : 
```javascript
module.exports = {
	fr: require("./fr.json"),
	en: require("./en.json")
};
```

##### -k, --keepKeys (default: false)
Keep non existing translations keys in the result translation file.

##### -e, --forceErase (default: false) :
By default, the command updates the output files on each run. Use this option to erase the output files instead of update it.

##### -v, --verbose (default: false)
Set verbose mode

##### -d, --dryRun (default: false)
Dry run mode, do the parsing but do not write locales files

##### --showDiff (default: false)
Show the differences between old and new locales files

##### -h, --help
Print the help message

##### --version
Print the package version


## :bug: Issues

I'm sure you'll find bugs and when you do it would be great if you'd could [report them here](https://github.com/oreliain/vue-i18n-extract-keys/issues).

## :muscle: Contribution

The project is still in its early stages and in progress. There's no need for guidelines yet, so feel free to contribute or give feedback as you prefer.


## :copyright: License

[MIT](http://opensource.org/licenses/MIT)