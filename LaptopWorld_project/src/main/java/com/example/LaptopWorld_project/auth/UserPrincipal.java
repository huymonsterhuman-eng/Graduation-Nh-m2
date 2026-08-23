package com.example.LaptopWorld_project.auth;

import com.example.LaptopWorld_project.user.entity.Role;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Wrap User entity de dung voi Spring Security ma khong lam User implement UserDetails
 * (tach coupling entity vs framework).
 */
@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String username;
    private final String password;
    private final UserStatus status;
    private final boolean emailVerified;
    private final List<GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.password = user.getPassword();
        this.status = user.getStatus();
        this.emailVerified = user.isEmailVerified();
        this.authorities = buildAuthorities(user);
    }

    private static List<GrantedAuthority> buildAuthorities(User user) {
        List<GrantedAuthority> list = new ArrayList<>();
        for (Role role : user.getRoles()) {
            list.add(new SimpleGrantedAuthority("ROLE_" + role.getName()));
            role.getPermissions().forEach(p ->
                list.add(new SimpleGrantedAuthority(p.getCode()))
            );
        }
        return list;
    }

    /**
     * List cac authority string (ROLE_* va permission code) — dung khi
     * dat vao JWT claim "auth" de client biet quyen.
     */
    public List<String> getAuthorityStrings() {
        return authorities.stream().map(GrantedAuthority::getAuthority).toList();
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return password; }
    @Override public String getUsername() { return username; }

    @Override public boolean isAccountNonExpired()  { return true; }
    @Override public boolean isAccountNonLocked()   { return status != UserStatus.banned; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()            { return status == UserStatus.active; }
}
