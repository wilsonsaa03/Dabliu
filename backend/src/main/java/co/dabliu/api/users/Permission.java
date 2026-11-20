package co.dabliu.api.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Permiso atómico (p. ej. "users.manage"). Se crean por migración, no desde la aplicación. */
@Entity
@Table(name = "permissions")
public class Permission {

    @Id
    @Column(length = 60)
    private String code;

    @Column(nullable = false, length = 40)
    private String module;

    @Column(nullable = false, length = 200)
    private String description;

    protected Permission() {
    }

    public String getCode() { return code; }
    public String getModule() { return module; }
    public String getDescription() { return description; }
}
