# frozen_string_literal: true

# name: discourse-polkassembly-auth
# about: Login with Polkassembly
# version: 0.0.1
# authors: Polkassembly
# url: https://github.com/polkassembly/discourse-polkassembly-oauth
# required_version: 2.7.0

%w[
  ../lib/omniauth/strategies/polkassembly_auth.rb
].each { |path| load File.expand_path(path, __FILE__) }

enabled_site_setting :discourse_polkassembly_auth_enabled
register_svg_icon 'fab-github'
register_asset 'stylesheets/discourse-polkassembly-auth.scss'

class ::PolkassemblyAuthenticator < ::Auth::ManagedAuthenticator
  def name
    'polkassembly'
  end

  def register_middleware(omniauth)
    omniauth.provider :polkassembly_auth,
                      setup: lambda { |env|
                        strategy = env['omniauth.strategy']
                      }
  end

  def enabled?
    SiteSetting.discourse_polkassembly_auth_enabled
  end

  def primary_email_verified?
    false
  end
end

auth_provider authenticator: ::PolkassemblyAuthenticator.new,
              icon: 'fab-github',
              title: 'Login with Polkassembly'

after_initialize do
  %w[
    ../lib/discourse_polkassembly_auth/engine.rb
    ../lib/discourse_polkassembly_auth/routes.rb
    ../app/controllers/discourse_polkassembly_auth/auth_controller.rb
    ../app/controllers/polkassembly_controller.rb
  ].each { |path| load File.expand_path(path, __FILE__) }

  Discourse::Application.routes.prepend do
    mount ::DiscoursePolkassemblyAuth::Engine, at: '/discourse-polkassembly-auth'
    get '/polkassembly-auth' => 'polkassembly#index'
  end
end