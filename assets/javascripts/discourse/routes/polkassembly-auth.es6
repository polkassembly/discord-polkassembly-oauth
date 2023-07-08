import Route from "@ember/routing/route";

export default Route.extend({
  renderTemplate() {
    // Renders the template `../templates/polkassembly-auth.hbs`
    this.render('polkassembly-auth');
  }
});
