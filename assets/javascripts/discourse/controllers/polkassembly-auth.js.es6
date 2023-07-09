/* eslint-disable no-console */
import Controller from "@ember/controller";

// Temp State : replace with @tracked properties
let tfa_token = null;
let user_id = null;

export default Controller.extend({
  init() {
    this._super(...arguments);
    this.submitWeb2Form();
  },

	async submitWeb2Form(username, password) {
    if(!username || !password) { throw new Error('Username and password are required.'); }

    try {
      const response = await fetch(`https://api.polkassembly.io/api/v1/auth/actions/login`, {
        body: JSON.stringify({ username, password }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });

      const resJSON = await response.json() || null;

      if(response.status !== 200 || !resJSON) { throw new Error(resJSON?.message || 'Polkassembly API fetch error.'); }

      if(resJSON?.token) {
        //TODO:  Decode token and send whatever you need to your backend to make things work!
				return resJSON.token;
			} else if(resJSON?.isTFAEnabled) {
				if(!resJSON?.tfa_token) { throw new Error(resJSON?.error || 'TFA token missing. Please try again.'); }
        // TODO: save tfa_token in a tracked property and use it to show the TFA form

			}
    } catch (e) {
      console.log(e);
      // TODO: Handle error by a @tracked property
    }
	},

  async submit2FAForm(authCode) {
    if(isNaN(authCode)) { throw new Error('Invalid authentication code.'); };

    try {
      const response = await fetch(`https://api.polkassembly.io/api/v1/auth/actions/2fa/validate`, {
        body: JSON.stringify({
          tfa_token, //tracked property
          user_id: Number(user_id), //tracked property,
          auth_code: String(authCode)
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });

      const resJSON = await response.json() || null;

      if(response.status !== 200 || !resJSON) { throw new Error(resJSON?.message || 'Polkassembly API fetch error.'); }

      if(resJSON?.token) {
        //TODO:  Decode token and send whatever you need to your backend to make things work!
				return resJSON.token;
			}
    } catch (e) {
      console.log(e);
      // TODO: Handle error by a @tracked property
    }
  },

  async onWalletClick(selectedWallet) {
    try {
      const wallet = window.injectedWeb3[selectedWallet] || null;
      if(!wallet) { throw new Error('Wallet not found.'); }

      const injected = wallet && wallet.enable && await wallet.enable('polkassembly');
      const signRaw = injected && injected.signer && injected.signer.signRaw;
			if (!signRaw) { throw new Error('Signer not available for wallet. Please reload and try again.'); }

    } catch (e) {
      console.log(e);
    }
  },

  actions: {
    async submitWeb2Form(username, password) {
      this.submitWeb2Form(username, password);
    },
    async submit2FAForm(authCode) {
      this.submit2FAForm(authCode);
    },
    async onWalletClick(selectedWallet) {
      this.onWalletClick(selectedWallet);
    }
  }
});
