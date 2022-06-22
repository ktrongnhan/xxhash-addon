module.exports = {
   ...require(process.env.DEBUG === undefined ? './build/Release/addon' : './build/Debug/addon')
};